-- Closes the anonymous RPC surface.
--
-- Postgres grants EXECUTE on every new function to PUBLIC by default, and
-- PostgREST exposes every function in the `public` schema at /rest/v1/rpc/<name>.
-- The anon key is embedded in the shipped JS bundle, so "PUBLIC has EXECUTE"
-- means "anyone on the internet can call this". Sixty-three SECURITY DEFINER
-- functions were reachable that way, including internal trigger helpers and one
-- unguarded DELETE.
--
-- Note the grants must be revoked from PUBLIC, not from `anon`. Revoking from
-- `anon` alone is a no-op while the PUBLIC grant (`=X/postgres` in proacl) stands.

begin;

-- ---------------------------------------------------------------------------
-- 1. Remove delete_all_messages entirely.
--
-- SECURITY DEFINER, `DELETE FROM public.messages` with no caller check, and
-- executable by anon. Nothing in the application has ever called it -- it
-- appears only in the generated types.ts -- so it is deleted rather than fixed.
-- ---------------------------------------------------------------------------
drop function if exists public.delete_all_messages();

-- ---------------------------------------------------------------------------
-- 2. Make update_verification_status trust the session, not its arguments.
--
-- The admin check read the caller-supplied `admin_id` parameter:
--     IF NOT EXISTS (SELECT 1 FROM users WHERE id = admin_id AND is_admin)
-- which only proves the *named* user is an admin, not the caller. Anyone who
-- knew an admin's UUID could approve or reject any mentor application.
--
-- The actor now comes from auth.uid(). `admin_id` stays in the signature so the
-- existing client call keeps working, but its value is ignored.
-- ---------------------------------------------------------------------------
create or replace function public.update_verification_status(
  verification_id uuid,
  new_status text,
  admin_id uuid,
  reason text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  v_actor UUID;
  target_user_id UUID;
  verification_data JSONB;
  user_data RECORD;
  v_cgpa NUMERIC;
  v_year_of_studies TEXT;
  v_university TEXT;
  v_hobbies TEXT;
  v_mobile TEXT;
  v_name TEXT;
  v_department TEXT;
  v_skills TEXT[];
  v_bio TEXT;
  v_linkedin_url TEXT;
  v_profile_image TEXT;
BEGIN
  -- The caller is whoever holds the JWT, never whoever the arguments name.
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_actor AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can update verification status';
  END IF;

  IF new_status NOT IN ('approved', 'rejected', 'pending') THEN
    RAISE EXCEPTION 'Invalid verification status: %', new_status;
  END IF;

  -- Update verification status and get the user data
  UPDATE public.mentor_verifications
  SET
    status = new_status,
    reviewed_at = NOW(),
    reviewed_by = v_actor,
    rejection_reason = CASE WHEN new_status = 'rejected' THEN reason ELSE NULL END
  WHERE id = verification_id
  RETURNING user_id, application_data, cgpa, year_of_studies, university, hobbies
  INTO target_user_id, verification_data, v_cgpa, v_year_of_studies, v_university, v_hobbies;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No verification found with id %', verification_id;
  END IF;

  -- Update user verification status
  UPDATE public.users
  SET verification_status = new_status
  WHERE id = target_user_id;

  IF new_status = 'approved' THEN
    -- Get user info
    SELECT * INTO user_data FROM public.users WHERE id = target_user_id;

    -- Extract data from verification
    v_mobile := verification_data->>'mobile';
    v_name := COALESCE(verification_data->>'name', user_data.name);
    v_department := COALESCE(verification_data->>'department', user_data.department, 'General');
    v_bio := COALESCE(verification_data->>'bio', user_data.bio, '');
    v_linkedin_url := COALESCE(verification_data->>'linkedin_url', user_data.linkedin_url);
    v_profile_image := COALESCE(verification_data->>'profile_image', user_data.profile_image);

    -- Parse skills
    v_skills := CASE
      WHEN verification_data->>'skills' IS NOT NULL AND verification_data->>'skills' != ''
      THEN string_to_array(trim(verification_data->>'skills'), ',')
      WHEN user_data.skills IS NOT NULL
      THEN user_data.skills
      ELSE ARRAY[]::text[]
    END;

    -- Update users table with mentor data
    UPDATE public.users
    SET
      name = v_name,
      department = v_department,
      bio = v_bio,
      linkedin_url = v_linkedin_url,
      profile_image = v_profile_image,
      mobile = v_mobile,
      skills = v_skills,
      role = CASE
        WHEN role = 'student' THEN 'mentor'
        WHEN role = 'both' THEN 'both'
        ELSE 'mentor'
      END
    WHERE id = target_user_id;

    -- Insert or update mentor record
    INSERT INTO public.mentors (
      id, name, department, skills, bio, linkedin_url, profile_image,
      rating, review_count, cgpa, year_of_studies, university, hobbies, mobile
    )
    VALUES (
      target_user_id,
      v_name,
      v_department,
      v_skills,
      v_bio,
      v_linkedin_url,
      v_profile_image,
      0, 0, v_cgpa, v_year_of_studies, v_university, v_hobbies, v_mobile
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      department = EXCLUDED.department,
      skills = EXCLUDED.skills,
      bio = EXCLUDED.bio,
      linkedin_url = EXCLUDED.linkedin_url,
      profile_image = EXCLUDED.profile_image,
      cgpa = EXCLUDED.cgpa,
      year_of_studies = EXCLUDED.year_of_studies,
      university = EXCLUDED.university,
      hobbies = EXCLUDED.hobbies,
      mobile = EXCLUDED.mobile;
  END IF;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (
    target_user_id, 'system',
    CASE
      WHEN new_status = 'approved' THEN 'Mentor Application Approved!'
      WHEN new_status = 'rejected' THEN 'Mentor Application Update'
      ELSE 'Mentor Application Status Updated'
    END,
    CASE
      WHEN new_status = 'approved' THEN 'Congratulations! Your mentor application has been approved.'
      WHEN new_status = 'rejected' THEN 'Your mentor application requires attention. ' || COALESCE(reason, '')
      ELSE 'Your mentor application status has been updated to: ' || new_status
    END
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Signed-in-only functions: revoke PUBLIC, grant `authenticated`.
--
-- None of these are reachable from a signed-out page. Messaging in particular
-- was an unauthenticated spam vector -- send_message and send_group_message
-- could both be driven straight from the public key.
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
  signed_in_only text[] := array[
    -- direct messaging
    'public.create_conversation(uuid, uuid)',
    'public.get_conversation(uuid, uuid)',
    'public.get_conversation_messages(uuid)',
    'public.send_message(uuid, uuid, uuid, text)',
    'public.mark_messages_as_read(uuid, uuid)',
    'public.mark_messages_delivered(uuid, uuid)',
    'public.update_typing_indicator(uuid, uuid, boolean)',
    'public.update_user_presence(uuid, boolean)',
    -- group chat
    'public.send_group_message(uuid, text, text, uuid)',
    'public.toggle_group_message_reaction(uuid, text)',
    'public.list_group_messages(uuid, text, integer)',
    -- community membership + people search
    'public.community_addable_users(uuid, text, integer)',
    -- ratings, certificates, impact
    'public.can_user_rate_mentor(uuid, uuid)',
    'public.my_certificate_status()',
    'public.mentor_impact(uuid)',
    -- collaborative canvas
    'public.create_canvas_session(uuid, text)',
    'public.create_canvas_session(text, uuid)',
    'public.join_canvas_session(text, uuid)',
    'public.get_canvas_session_participants(uuid)',
    -- admin
    'public.log_admin_action(text, uuid, jsonb)',
    'public.promote_to_admin_with_code(text, uuid)',
    'public.update_verification_status(uuid, text, uuid, text)',
    'public.auto_award_performance_badges()'
  ];
begin
  foreach fn in array signed_in_only loop
    if to_regprocedure(fn) is not null then
      execute format('revoke all on function %s from public, anon', fn);
      execute format('grant execute on function %s to authenticated', fn);
    else
      raise notice 'skipped (not found): %', fn;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Internal machinery: revoke from PUBLIC, anon and authenticated alike.
--
-- Trigger functions fire as part of the triggering statement and do not consult
-- EXECUTE privileges at run time (that is checked once, at CREATE TRIGGER), so
-- removing the grants costs nothing. The cron-driven and event-trigger
-- functions are reached by the scheduler under the service role.
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
  internal_only text[] := array[
    -- trigger functions, never callable as RPC
    'public.auto_approve_mentor_application()',
    'public.communities_add_owner_as_member()',
    'public.communities_set_slug()',
    'public.community_members_recount()',
    'public.community_posts_recount()',
    'public.handle_mentor_review_change()',
    'public.handle_new_user()',
    'public.notify_admin_contact_message()',
    'public.notify_admin_mentor_application()',
    'public.notify_badge_award()',
    'public.notify_message_email()',
    'public.update_faculty_rating_stats()',
    'public.update_faculty_review_helpful_count()',
    'public.update_post_comments_count()',
    'public.update_post_likes_count()',
    -- event trigger
    'public.rls_auto_enable()',
    -- cron-driven / internal helpers
    'public.prompt_graduated_mentors()',
    'public.graduated_mentors_awaiting_confirmation()',
    'public.update_mentor_rating(uuid)'
  ];
begin
  foreach fn in array internal_only loop
    if to_regprocedure(fn) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', fn);
    else
      raise notice 'skipped (not found): %', fn;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Deliberately public functions.
--
-- These back pages a signed-out visitor can reach (the landing page, the
-- faculty directory, mentor profiles, public communities and posts, and the
-- shareable certificate verification link), plus the helpers that RLS policy
-- expressions call. Policy expressions are evaluated as the querying role, so
-- anon genuinely needs EXECUTE on those six -- revoking them would break
-- public browsing. Re-granted explicitly so the intent is recorded rather than
-- inherited from the PUBLIC default.
-- ---------------------------------------------------------------------------
do $$
declare
  fn text;
  public_fns text[] := array[
    -- public pages
    'public.get_team_members_public()',
    'public.get_faculty_directory_stats()',
    'public.get_top_rated_faculty(integer, integer)',
    'public.get_faculty_tag_counts(uuid)',
    'public.get_faculty_reviews(uuid)',
    'public.get_mentor_reviews(uuid)',
    'public.get_certificate(uuid)',
    'public.list_communities(text, text, boolean, integer, integer)',
    'public.get_community(text)',
    'public.get_community_feed(text, text, integer, integer, uuid, boolean)',
    'public.get_community_members(uuid, integer)',
    'public.get_community_post(uuid)',
    'public.get_post_comments(uuid)',
    -- helpers referenced by RLS policy expressions
    'public.is_admin_user(uuid)',
    'public.is_active_mentor(uuid)',
    'public.is_community_member(uuid, uuid)',
    'public.is_community_owner(uuid, uuid)',
    'public.can_view_community(uuid, uuid)',
    'public.can_view_post(uuid, uuid)',
    'public.can_start_another_group(uuid)'
  ];
begin
  foreach fn in array public_fns loop
    if to_regprocedure(fn) is not null then
      execute format('revoke all on function %s from public', fn);
      execute format('grant execute on function %s to anon, authenticated', fn);
    else
      raise notice 'skipped (not found): %', fn;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Stop handing out the PUBLIC default to functions added from here on.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public;

commit;
