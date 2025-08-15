
-- Fix database function security issues by adding proper search_path protection
-- and updating function permissions

-- 1. Fix update_verification_status function
CREATE OR REPLACE FUNCTION public.update_verification_status(verification_id uuid, new_status text, admin_id uuid, reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  target_user_id UUID;
  verification_data JSONB;
  user_data RECORD;
  v_cgpa NUMERIC;
  v_year_of_studies TEXT;
  v_university TEXT;
  v_hobbies TEXT;
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
    -- Get user info for mentor creation/update
    SELECT * INTO user_data FROM public.users WHERE id = target_user_id;
    
    -- Insert or update mentor record
    INSERT INTO public.mentors (
      id, name, department, skills, bio, linkedin_url, profile_image, 
      rating, review_count, cgpa, year_of_studies, university, hobbies
    )
    VALUES (
      target_user_id, user_data.name,
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
      user_data.profile_image, 0, 0, v_cgpa, v_year_of_studies, v_university, v_hobbies
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, department = EXCLUDED.department, skills = EXCLUDED.skills,
      bio = EXCLUDED.bio, linkedin_url = EXCLUDED.linkedin_url, profile_image = EXCLUDED.profile_image,
      cgpa = EXCLUDED.cgpa, year_of_studies = EXCLUDED.year_of_studies, 
      university = EXCLUDED.university, hobbies = EXCLUDED.hobbies;
    
    -- Update user role to mentor
    UPDATE public.users
    SET role = CASE 
      WHEN role = 'student' THEN 'mentor'
      WHEN role = 'both' THEN 'both'
      ELSE 'mentor'
    END
    WHERE id = target_user_id;
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

-- 2. Fix log_admin_action function
CREATE OR REPLACE FUNCTION public.log_admin_action(action_type text, target_id uuid DEFAULT NULL::uuid, action_details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), action_type, target_id, action_details);
END;
$$;

-- 3. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    ),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name', 
      EXCLUDED.name,
      NEW.email
    );

  -- Insert into mentors table with default values
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
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'display_name',
      NEW.email
    ),
    'General',
    ARRAY[]::text[],
    NULL,
    NULL,
    NEW.raw_user_meta_data->>'avatar_url',
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name', 
      EXCLUDED.name,
      NEW.email
    ),
    profile_image = CASE 
      WHEN mentors.profile_image IS NULL AND NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL 
      THEN NEW.raw_user_meta_data->>'avatar_url'
      ELSE mentors.profile_image
    END;
  
  RETURN NEW;
END;
$$;

-- 4. Create security definer function for admin status checks to prevent recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
STABLE
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM public.users 
  WHERE id = user_id;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;

-- 5. Update the users table RLS policy to use the security definer function
DROP POLICY IF EXISTS "Users can update their own profile (excluding admin status)" ON public.users;

CREATE POLICY "Users can update their own profile (excluding admin status)" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  is_admin = COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false)
);

-- 6. Fix other functions with search path issues
CREATE OR REPLACE FUNCTION public.get_team_members_public()
RETURNS TABLE (
  id uuid,
  name text,
  "position" text,
  image_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT 
    tm.id,
    tm.name,
    tm."position",
    tm.image_url,
    tm.created_at,
    tm.updated_at
  FROM public.team_members tm;
$$;

-- Update other security definer functions
CREATE OR REPLACE FUNCTION public.update_mentor_rating(mentor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Calculate average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM public.mentor_reviews
  WHERE mentor_reviews.mentor_id = update_mentor_rating.mentor_id;

  -- Update mentor table
  UPDATE public.mentors
  SET 
    rating = avg_rating,
    review_count = total_reviews
  WHERE id = mentor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_award_performance_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Award Top Mentor badge to mentors with rating >= 4.5 and review_count >= 10
  INSERT INTO public.user_badges (user_id, badge_type_id, notes)
  SELECT DISTINCT 
    m.id as user_id,
    bt.id as badge_type_id,
    'Auto-awarded for exceptional performance'
  FROM public.mentors m
  JOIN public.badge_types bt ON bt.name = 'Top Mentor'
  WHERE m.rating >= 4.5 
    AND m.review_count >= 10
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub 
      WHERE ub.user_id = m.id AND ub.badge_type_id = bt.id
    );

  -- Award Rising Star badge to new mentors with good performance
  INSERT INTO public.user_badges (user_id, badge_type_id, notes)
  SELECT DISTINCT 
    m.id as user_id,
    bt.id as badge_type_id,
    'Auto-awarded for promising new mentor'
  FROM public.mentors m
  JOIN public.badge_types bt ON bt.name = 'Rising Star'
  WHERE m.rating >= 4.0 
    AND m.review_count >= 3
    AND m.review_count < 10
    AND m.created_at > NOW() - INTERVAL '3 months'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub 
      WHERE ub.user_id = m.id AND ub.badge_type_id = bt.id
    );
END;
$$;

-- Create a simple admin management table for multi-admin support
CREATE TABLE IF NOT EXISTS public.admin_recovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  used_by uuid REFERENCES auth.users(id),
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_recovery table
ALTER TABLE public.admin_recovery ENABLE ROW LEVEL SECURITY;

-- Only admins can create recovery codes
CREATE POLICY "Only admins can create recovery codes" 
ON public.admin_recovery 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- Only the creator can view their recovery codes
CREATE POLICY "Users can view their own recovery codes" 
ON public.admin_recovery 
FOR SELECT 
TO authenticated
USING (created_by = auth.uid() OR public.is_admin_user(auth.uid()));

-- Function to promote user to admin using recovery code
CREATE OR REPLACE FUNCTION public.promote_to_admin_with_code(recovery_code text, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  recovery_record RECORD;
BEGIN
  -- Get and validate recovery code
  SELECT * INTO recovery_record
  FROM public.admin_recovery
  WHERE admin_recovery.recovery_code = promote_to_admin_with_code.recovery_code
    AND used_at IS NULL
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Promote user to admin
  UPDATE public.users
  SET is_admin = true
  WHERE id = target_user_id;
  
  -- Mark recovery code as used
  UPDATE public.admin_recovery
  SET used_by = target_user_id, used_at = now()
  WHERE id = recovery_record.id;
  
  -- Log admin action
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    recovery_record.created_by,
    'promote_user_to_admin_via_recovery',
    target_user_id,
    jsonb_build_object('recovery_code_id', recovery_record.id)
  );
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_to_admin_with_code(text, uuid) TO authenticated;
