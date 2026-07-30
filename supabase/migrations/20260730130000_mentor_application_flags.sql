-- Approve mentor applications instantly, but record what looks wrong.
--
-- auto_approve_mentor_application already forced status = 'approved' on every
-- application, so "verified mentor" meant nothing more than "filled the form".
-- Requiring an admin click instead would be safer but stalls every applicant
-- behind one person's attention, which a platform with one mentor cannot afford.
--
-- So: keep instant approval, and compute the checks a reviewer would have done
-- anyway into a flags array. Nobody waits, and anything suspicious is queued for
-- a look afterwards. If nobody ever reviews the queue this degrades to the old
-- behaviour rather than locking people out.

alter table public.mentor_verifications
  add column if not exists graduation_year smallint,
  add column if not exists flags text[] not null default '{}';

comment on column public.mentor_verifications.flags is
  'Checks that failed at submission. Approval is not blocked; these are for after-the-fact admin review.';

create index if not exists mentor_verifications_flagged_idx
  on public.mentor_verifications (submitted_at desc)
  where cardinality(flags) > 0;

create or replace function public.auto_approve_mentor_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_data record;
  v_mobile text;
  v_name text;
  v_department text;
  v_skills text[];
  v_bio text;
  v_linkedin_url text;
  v_profile_image text;
  v_flags text[] := '{}';
  v_enrolled int;
  v_gap int;
  v_college_id_usable boolean := false;
begin
  select * into user_data from public.users where id = new.user_id;

  v_mobile        := new.application_data->>'mobile';
  v_name          := coalesce(new.application_data->>'name', user_data.name);
  v_department    := coalesce(new.application_data->>'department', user_data.department, 'General');
  v_bio           := coalesce(new.application_data->>'bio', user_data.bio, '');
  v_linkedin_url  := coalesce(new.application_data->>'linkedin_url', user_data.linkedin_url);
  v_profile_image := coalesce(new.application_data->>'profile_image', user_data.profile_image);

  v_skills := case
    when new.application_data->>'skills' is not null and new.application_data->>'skills' != ''
    then string_to_array(trim(new.application_data->>'skills'), ',')
    when user_data.skills is not null then user_data.skills
    else array[]::text[]
  end;

  -- -------------------------------------------------------------------------
  -- Checks. Each appends a flag; none of them stop the approval.
  -- -------------------------------------------------------------------------

  if new.college_id is null or new.college_id = '' then
    v_flags := v_flags || 'college_id_missing'::text;
  elsif new.college_id !~ '^AP[0-9]{11}$' then
    -- Should be unreachable: the column has a CHECK constraint and the form
    -- validates too. Kept so a direct insert cannot slip past unnoticed.
    v_flags := v_flags || 'college_id_malformed'::text;
  else
    v_enrolled := 2000 + substring(new.college_id, 3, 2)::int;

    -- The strongest automatic check: an enrollment number belongs to one person,
    -- so a second account claiming it is either a typo or an impersonation.
    if exists (
      select 1 from public.users u
       where u.college_id = new.college_id and u.id <> new.user_id
    ) then
      v_flags := v_flags || 'college_id_duplicate'::text;
    else
      v_college_id_usable := true;
    end if;

    if new.graduation_year is not null then
      v_gap := new.graduation_year - v_enrolled;
      -- Wide on purpose: catches "enrolled 2023, graduating 2024", not the
      -- difference between a 3-year and 4-year BSc.
      if v_gap < 2 or v_gap > 7 then
        v_flags := v_flags || 'graduation_year_implausible'::text;
      end if;
    end if;
  end if;

  if new.graduation_year is null then
    v_flags := v_flags || 'graduation_year_missing'::text;
  end if;

  -- SRM AP grades out of 10. A value at or under 4 is almost always a 4-point
  -- GPA typed into a 10-point field, which makes a strong student look weak.
  if new.cgpa is not null and new.cgpa <= 4 then
    v_flags := v_flags || 'cgpa_possibly_4_point_scale'::text;
  end if;

  new.flags := v_flags;
  new.status := 'approved';
  new.reviewed_at := now();

  -- -------------------------------------------------------------------------
  -- Propagate. college_id is written only when it is not already taken, so the
  -- unique index cannot abort the application; the duplicate flag records why.
  -- -------------------------------------------------------------------------

  update public.users
     set verification_status = 'approved',
         name = v_name,
         department = v_department,
         bio = v_bio,
         linkedin_url = v_linkedin_url,
         profile_image = v_profile_image,
         mobile = coalesce(v_mobile, mobile),
         skills = v_skills,
         college_id = case when v_college_id_usable then new.college_id else college_id end,
         graduation_year = coalesce(new.graduation_year, graduation_year),
         role = case when role = 'student' then 'mentor' when role = 'both' then 'both' else 'mentor' end
   where id = new.user_id;

  insert into public.mentors (
    id, name, department, skills, bio, linkedin_url, profile_image,
    rating, review_count, cgpa, year_of_studies, graduation_year, university, hobbies, mobile
  )
  values (
    new.user_id, v_name, v_department, v_skills, v_bio, v_linkedin_url, v_profile_image,
    0, 0, new.cgpa, new.year_of_studies, new.graduation_year, new.university, new.hobbies, v_mobile
  )
  on conflict (id) do update set
    name = excluded.name,
    department = excluded.department,
    skills = excluded.skills,
    bio = excluded.bio,
    linkedin_url = excluded.linkedin_url,
    profile_image = coalesce(excluded.profile_image, public.mentors.profile_image),
    cgpa = excluded.cgpa,
    year_of_studies = excluded.year_of_studies,
    graduation_year = excluded.graduation_year,
    university = excluded.university,
    hobbies = excluded.hobbies,
    mobile = excluded.mobile;

  insert into public.notifications (user_id, type, title, content)
  values (
    new.user_id, 'system',
    'Welcome, Mentor! 🎉',
    'Your mentor profile is live. Students can now find and message you.'
  );

  return new;
end;
$$;
