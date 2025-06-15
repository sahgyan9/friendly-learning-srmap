
-- Update the mentor verification system to properly integrate with mentor registration
-- Add a trigger to create notifications when mentor verifications are submitted
CREATE OR REPLACE FUNCTION public.notify_admin_mentor_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Create notifications for all admin users
  FOR admin_user IN 
    SELECT id FROM public.users WHERE is_admin = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
      admin_user.id,
      'system',
      'New Mentor Application',
      'A new mentor application has been submitted and requires review.',
      jsonb_build_object(
        'verification_id', NEW.id,
        'user_id', NEW.user_id,
        'type', 'mentor_application'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for mentor verification notifications
DROP TRIGGER IF EXISTS on_mentor_verification_submitted ON public.mentor_verifications;
CREATE TRIGGER on_mentor_verification_submitted
  AFTER INSERT ON public.mentor_verifications
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_admin_mentor_application();

-- Update the verification status update function to handle mentor creation properly
CREATE OR REPLACE FUNCTION public.update_verification_status(verification_id uuid, new_status text, admin_id uuid, reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  verification_data JSONB;
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
  RETURNING user_id, application_data INTO target_user_id, verification_data;

  -- Update user verification status
  UPDATE public.users
  SET verification_status = new_status
  WHERE id = target_user_id;

  -- If approved, create the mentor record
  IF new_status = 'approved' THEN
    -- Get user info for mentor creation
    INSERT INTO public.mentors (
      id, 
      name, 
      department, 
      skills, 
      bio, 
      linkedin_url, 
      profile_image, 
      rating, 
      review_count
    )
    SELECT 
      u.id,
      u.name,
      COALESCE(verification_data->>'department', u.department, 'General'),
      CASE 
        WHEN verification_data->>'skills' IS NOT NULL 
        THEN string_to_array(verification_data->>'skills', ',')
        ELSE u.skills
      END,
      COALESCE(verification_data->>'bio', u.bio),
      COALESCE(verification_data->>'linkedin_url', u.linkedin_url),
      u.profile_image,
      0,
      0
    FROM public.users u
    WHERE u.id = target_user_id
    ON CONFLICT (id) DO NOTHING;
    
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
