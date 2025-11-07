-- Add missing columns to users table for complete user profiles
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS email_frequency text DEFAULT 'immediate',
ADD COLUMN IF NOT EXISTS mobile text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS skills text[];

-- Add comment explaining the structure
COMMENT ON TABLE public.users IS 'Primary user table containing all user profile information. When users become approved mentors, their data is synced to the mentors table.';