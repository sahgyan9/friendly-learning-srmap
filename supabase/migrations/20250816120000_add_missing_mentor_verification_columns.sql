-- Add missing columns to mentor_verifications table
ALTER TABLE public.mentor_verifications 
ADD COLUMN IF NOT EXISTS cgpa NUMERIC,
ADD COLUMN IF NOT EXISTS year_of_studies TEXT,
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_mentor_verifications_status ON public.mentor_verifications(status);
CREATE INDEX IF NOT EXISTS idx_mentor_verifications_user_status ON public.mentor_verifications(user_id, status);
