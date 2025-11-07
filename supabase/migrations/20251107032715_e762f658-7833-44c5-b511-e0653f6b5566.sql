-- Sync existing mentor data to users table
UPDATE public.users u
SET 
  department = m.department,
  bio = m.bio,
  linkedin_url = m.linkedin_url,
  profile_image = COALESCE(u.profile_image, m.profile_image),
  mobile = m.mobile,
  skills = m.skills
FROM public.mentors m
WHERE u.id = m.id
  AND (
    u.department IS NULL OR 
    u.bio IS NULL OR 
    u.linkedin_url IS NULL OR 
    u.mobile IS NULL OR
    u.skills IS NULL OR
    u.skills = ARRAY[]::text[]
  );

-- Update the verification status function to sync data to both tables
CREATE OR REPLACE FUNCTION public.update_verification_status(
  verification_id uuid, 
  new_status text, 
  admin_id uuid, 
  reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
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
  -- Check if the requester is admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can update verification status';
  END IF;

  -- Update verification status and get the user data
  UPDATE public.mentor_verifications
  SET 
    status = new_status,
    reviewed_at = NOW(),
    reviewed_by = admin_id,
    rejection_reason = CASE WHEN new_status = 'rejected' THEN reason ELSE NULL END
  WHERE id = verification_id
  RETURNING user_id, application_data, cgpa, year_of_studies, university, hobbies 
  INTO target_user_id, verification_data, v_cgpa, v_year_of_studies, v_university, v_hobbies;

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
$$;