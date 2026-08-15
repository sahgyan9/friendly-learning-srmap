-- supabase/migrations/20260815210000_ai_overview_feedback_status.sql
ALTER TABLE public.ai_overview_feedback 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';

-- Add an UPDATE policy for admins
CREATE POLICY "Admins can update feedback status" 
ON public.ai_overview_feedback 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Grant update privileges to authenticated users
GRANT UPDATE ON TABLE public.ai_overview_feedback TO authenticated;
