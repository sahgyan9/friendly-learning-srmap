
-- Fix the handle_new_user function to preserve existing profile images
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into users table (existing logic)
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

  -- Insert into mentors table with default values, preserving existing profile_image
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
    -- Only update profile_image if the existing one is null and we have avatar_url from auth
    profile_image = CASE 
      WHEN mentors.profile_image IS NULL AND NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL 
      THEN NEW.raw_user_meta_data->>'avatar_url'
      ELSE mentors.profile_image
    END;
  
  RETURN NEW;
END;
$$;
