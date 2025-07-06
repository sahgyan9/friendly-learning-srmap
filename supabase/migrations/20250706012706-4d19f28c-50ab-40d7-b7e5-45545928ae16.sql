
-- Add new columns to the mentor_verifications table to store additional application data
ALTER TABLE public.mentor_verifications 
ADD COLUMN IF NOT EXISTS cgpa DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS year_of_studies TEXT,
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT;

-- Add new columns to the mentors table to display this information in profiles
ALTER TABLE public.mentors
ADD COLUMN IF NOT EXISTS cgpa DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS year_of_studies TEXT,
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT;

-- Update the existing departments in mentors table to include "Others" option
-- This doesn't change the structure, just makes "Others" a valid department option

-- Update the update_verification_status function to handle the new fields
CREATE OR REPLACE FUNCTION public.update_verification_status(verification_id uuid, new_status text, admin_id uuid, reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  verification_data JSONB;
  user_data RECORD;
  verification_record RECORD;
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
  RETURNING user_id, application_data, cgpa, year_of_studies, university, hobbies INTO target_user_id, verification_data, verification_record.cgpa, verification_record.year_of_studies, verification_record.university, verification_record.hobbies;

  -- Update user verification status
  UPDATE public.users
  SET verification_status = new_status
  WHERE id = target_user_id;

  -- If approved, create or update the mentor record
  IF new_status = 'approved' THEN
    -- Get user info for mentor creation/update
    SELECT * INTO user_data FROM public.users WHERE id = target_user_id;
    
    -- Insert or update mentor record with proper data mapping including new fields
    INSERT INTO public.mentors (
      id, 
      name, 
      department, 
      skills, 
      bio, 
      linkedin_url, 
      profile_image, 
      rating, 
      review_count,
      cgpa,
      year_of_studies,
      university,
      hobbies
    )
    VALUES (
      target_user_id,
      user_data.name,
      COALESCE(verification_data->>'department', user_data.department, 'General'),
      CASE 
        WHEN verification_data->>'skills' IS NOT NULL AND verification_data->>'skills' != ''
        THEN string_to_array(trim(verification_data->>'skills'), ',')
        WHEN user_data.skills IS NOT NULL
        THEN user_data.skills
        ELSE ARRAY[]::text[]
      END,
      COALESCE(verification_data->>'bio', user_data.bio, ''),
      COALESCE(verification_data->>'linkedin_url', user_data.linkedin_url),
      user_data.profile_image,
      0,
      0,
      verification_record.cgpa,
      verification_record.year_of_studies,
      verification_record.university,
      verification_record.hobbies
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
      hobbies = EXCLUDED.hobbies;
    
    -- Update user role to mentor
    UPDATE public.users
    SET role = CASE 
      WHEN role = 'student' THEN 'mentor'
      WHEN role = 'both' THEN 'both'
      ELSE 'mentor'
    END
    WHERE id = target_user_id;
  END IF;

  -- Create notification for the user
  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (
    target_user_id,
    'system',
    CASE 
      WHEN new_status = 'approved' THEN 'Mentor Application Approved!'
      WHEN new_status = 'rejected' THEN 'Mentor Application Update'
      ELSE 'Mentor Application Status Updated'
    END,
    CASE 
      WHEN new_status = 'approved' THEN 'Congratulations! Your mentor application has been approved. You can now start mentoring students.'
      WHEN new_status = 'rejected' THEN 'Your mentor application requires attention. ' || COALESCE(reason, 'Please contact support for more information.')
      ELSE 'Your mentor application status has been updated to: ' || new_status
    END
  );
END;
$$;
