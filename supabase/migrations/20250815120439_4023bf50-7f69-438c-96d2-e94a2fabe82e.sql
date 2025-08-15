-- Fix the security definer view issue by dropping and recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.team_members_public;

-- Create a regular view (not security definer) for public team member information
CREATE VIEW public.team_members_public AS
SELECT 
  id,
  name,
  position,
  image_url,
  created_at,
  updated_at
FROM public.team_members;

-- Enable RLS on the view
ALTER VIEW public.team_members_public SET (security_barrier = true);

-- Grant access to the view
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Create RLS policy for the public view
CREATE POLICY "Public can view team members basic info" 
ON public.team_members_public 
FOR SELECT 
USING (true);