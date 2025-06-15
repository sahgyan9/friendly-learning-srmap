
-- Update the trigger function to use 'student' as the default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'student'  -- Use 'student' instead of 'user' to match check constraint
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up any existing users with invalid 'user' role
UPDATE public.users 
SET role = 'student' 
WHERE role = 'user';

-- Set your account to mentor role
UPDATE public.users 
SET role = 'mentor' 
WHERE email = 'sahgyan9@gmail.com';
