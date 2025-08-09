
-- Phase 1: Fix Critical Admin Privilege Escalation
-- Remove ability for users to update their own is_admin status
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can update their own profile (excluding admin status)" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from changing their admin status
  is_admin = (SELECT is_admin FROM public.users WHERE id = auth.uid())
);

-- Phase 2: Fix Database Function Security (add secure search paths)
-- Update all functions to use secure search paths

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
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

CREATE OR REPLACE FUNCTION public.update_verification_status(verification_id uuid, new_status text, admin_id uuid, reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
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

-- Phase 3: Fix RLS Policy Issues
-- Fix marketplace posts to restrict to own posts only
DROP POLICY IF EXISTS "Authenticated users can update their own posts" ON public.marketplace_posts;
DROP POLICY IF EXISTS "Authenticated users can delete marketplace posts" ON public.marketplace_posts;

-- Add user_id column to marketplace_posts if it doesn't exist
ALTER TABLE public.marketplace_posts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing posts to have a user_id (set to null for now, admins can assign)
-- CREATE INDEX IF NOT EXISTS idx_marketplace_posts_user_id ON public.marketplace_posts(user_id);

CREATE POLICY "Users can update their own marketplace posts" 
ON public.marketplace_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marketplace posts" 
ON public.marketplace_posts 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create marketplace posts with user_id" 
ON public.marketplace_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix team members - restrict to admin only
DROP POLICY IF EXISTS "Allow authenticated users to manage team members" ON public.team_members;

CREATE POLICY "Only admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Clean up redundant mentor policies
DROP POLICY IF EXISTS "Allow all operations for now" ON public.mentors;
DROP POLICY IF EXISTS "Allow public read access to mentors" ON public.mentors;
DROP POLICY IF EXISTS "Allow users to update their own mentor profile" ON public.mentors;

-- Keep only the essential mentor policies
-- (The existing ones should be sufficient: Anyone can view, Users can create/update/delete their own)

-- Add audit logging table for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(action_type TEXT, target_id UUID DEFAULT NULL, action_details JSONB DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path FROM CURRENT
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (auth.uid(), action_type, target_id, action_details);
END;
$$;
