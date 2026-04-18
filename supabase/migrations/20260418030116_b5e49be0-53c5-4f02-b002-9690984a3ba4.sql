-- Auto-approve trigger for mentor_verifications
CREATE OR REPLACE FUNCTION public.auto_approve_mentor_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_data RECORD;
  v_mobile TEXT;
  v_name TEXT;
  v_department TEXT;
  v_skills TEXT[];
  v_bio TEXT;
  v_linkedin_url TEXT;
  v_profile_image TEXT;
BEGIN
  -- Force approval
  NEW.status := 'approved';
  NEW.reviewed_at := now();

  -- Update user verification status & role
  SELECT * INTO user_data FROM public.users WHERE id = NEW.user_id;

  v_mobile := NEW.application_data->>'mobile';
  v_name := COALESCE(NEW.application_data->>'name', user_data.name);
  v_department := COALESCE(NEW.application_data->>'department', user_data.department, 'General');
  v_bio := COALESCE(NEW.application_data->>'bio', user_data.bio, '');
  v_linkedin_url := COALESCE(NEW.application_data->>'linkedin_url', user_data.linkedin_url);
  v_profile_image := COALESCE(NEW.application_data->>'profile_image', user_data.profile_image);

  v_skills := CASE
    WHEN NEW.application_data->>'skills' IS NOT NULL AND NEW.application_data->>'skills' != ''
    THEN string_to_array(trim(NEW.application_data->>'skills'), ',')
    WHEN user_data.skills IS NOT NULL THEN user_data.skills
    ELSE ARRAY[]::text[]
  END;

  UPDATE public.users
  SET
    verification_status = 'approved',
    name = v_name,
    department = v_department,
    bio = v_bio,
    linkedin_url = v_linkedin_url,
    profile_image = v_profile_image,
    mobile = COALESCE(v_mobile, mobile),
    skills = v_skills,
    role = CASE WHEN role = 'student' THEN 'mentor' WHEN role = 'both' THEN 'both' ELSE 'mentor' END
  WHERE id = NEW.user_id;

  -- Insert/update mentor record
  INSERT INTO public.mentors (
    id, name, department, skills, bio, linkedin_url, profile_image,
    rating, review_count, cgpa, year_of_studies, university, hobbies, mobile
  )
  VALUES (
    NEW.user_id, v_name, v_department, v_skills, v_bio, v_linkedin_url, v_profile_image,
    0, 0, NEW.cgpa, NEW.year_of_studies, NEW.university, NEW.hobbies, v_mobile
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    department = EXCLUDED.department,
    skills = EXCLUDED.skills,
    bio = EXCLUDED.bio,
    linkedin_url = EXCLUDED.linkedin_url,
    profile_image = COALESCE(EXCLUDED.profile_image, public.mentors.profile_image),
    cgpa = EXCLUDED.cgpa,
    year_of_studies = EXCLUDED.year_of_studies,
    university = EXCLUDED.university,
    hobbies = EXCLUDED.hobbies,
    mobile = EXCLUDED.mobile;

  -- Welcome notification
  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (
    NEW.user_id, 'system',
    'Welcome, Mentor! 🎉',
    'Your mentor profile is live. Students can now find and message you.'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_approve_mentor_application_trigger ON public.mentor_verifications;
CREATE TRIGGER auto_approve_mentor_application_trigger
BEFORE INSERT ON public.mentor_verifications
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_mentor_application();
