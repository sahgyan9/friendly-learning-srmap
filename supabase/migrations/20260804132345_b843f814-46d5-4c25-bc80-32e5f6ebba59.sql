-- 1. Column-level protection for sensitive public-readable columns
REVOKE SELECT ON public.mentors FROM anon;
GRANT SELECT (id, name, department, skills, rating, profile_image, linkedin_url, bio,
              review_count, created_at, year_of_studies, university, graduation_year,
              is_alumni, company, job_title, is_available, available_from, availability_note)
  ON public.mentors TO anon;

REVOKE SELECT ON public.faculty FROM anon;
GRANT SELECT (id, name, designation, department, school, profile_image, avg_rating,
              rating_count, created_at, updated_at, slug, profile_url, image_url, source,
              is_active, avg_overall, avg_teaching, avg_grading, avg_helpfulness, last_synced_at)
  ON public.faculty TO anon;

REVOKE SELECT ON public.marketplace_posts FROM anon;
GRANT SELECT (id, title, description, category, date, author, image_url, external_link,
              created_at, updated_at, user_id)
  ON public.marketplace_posts TO anon;

-- 2. Storage: team_members bucket is admin-only for writes
DROP POLICY IF EXISTS "Authenticated users can upload team member images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update team member images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete team member images" ON storage.objects;

CREATE POLICY "Admins can upload team member images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team_members' AND public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update team member images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team_members' AND public.is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'team_members' AND public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete team member images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team_members' AND public.is_admin_user(auth.uid()));

-- 3. Storage: community-posts uploads must be owned by the uploader
DROP POLICY IF EXISTS "Authenticated users can upload community post images" ON storage.objects;

CREATE POLICY "Users can upload their own community post images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-posts' AND owner = auth.uid());

CREATE POLICY "Users can update their own community post images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-posts' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'community-posts' AND owner = auth.uid());

CREATE POLICY "Users can delete their own community post images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-posts' AND owner = auth.uid());

-- 4. Storage: marketplace update must enforce ownership in WITH CHECK too
DROP POLICY IF EXISTS "Authenticated Users can update images" ON storage.objects;

CREATE POLICY "Owners can update marketplace images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketplace' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'marketplace' AND owner = auth.uid());

-- 5. Fix mutable search_path on our own function
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- 6. Revoke API EXECUTE on internal SECURITY DEFINER routines.
--    Trigger functions are never meant to be called over the API.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Destructive / internal maintenance helpers: nobody may call these over the API.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.proname IN (
         'delete_all_messages',
         'auto_award_performance_badges',
         'graduated_mentors_awaiting_confirmation',
         'prompt_graduated_mentors',
         'resume_expired_mentor_availability',
         'rls_auto_enable',
         'update_mentor_rating',
         'log_admin_action'
       )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Sign-in-only helpers: not callable anonymously.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.proname IN (
         'create_conversation','get_conversation','get_conversation_messages',
         'mark_messages_as_read','mark_messages_delivered','send_message',
         'send_group_message','toggle_group_message_reaction',
         'create_canvas_session','join_canvas_session','get_canvas_session_participants',
         'community_addable_users','can_start_another_group','can_user_rate_mentor',
         'request_to_join_community','respond_to_invite','set_mentor_availability',
         'update_typing_indicator','update_user_presence','is_admin_user',
         'chat_participant_profiles','issue_certificate_if_earned'
       )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;
