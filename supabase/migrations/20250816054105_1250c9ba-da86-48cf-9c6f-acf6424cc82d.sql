
-- Add missing columns to contact_responses table
ALTER TABLE public.contact_responses 
ADD COLUMN IF NOT EXISTS recipient_email text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS recipient_name text NOT NULL DEFAULT '';

-- Update the columns to remove the default constraint after adding them
ALTER TABLE public.contact_responses 
ALTER COLUMN recipient_email DROP DEFAULT,
ALTER COLUMN recipient_name DROP DEFAULT;
