
-- Update the check constraint to include 'approved' as a valid verification status
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_verification_status_check;

ALTER TABLE public.users 
ADD CONSTRAINT users_verification_status_check 
CHECK (verification_status IN ('pending', 'verified', 'rejected', 'approved'));
