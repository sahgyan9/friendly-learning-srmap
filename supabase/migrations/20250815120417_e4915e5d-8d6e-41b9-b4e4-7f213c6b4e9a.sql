-- Create a secure view for public team member information (excludes emails)
CREATE OR REPLACE VIEW public.team_members_public AS
SELECT 
  id,
  name,
  position,
  image_url,
  created_at,
  updated_at
FROM public.team_members;

-- Grant public access to the view
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Update RLS policy for team_members to restrict email access
DROP POLICY IF EXISTS "Allow public read access to team members" ON public.team_members;

-- New policy: Only admins can see full team member data including emails
CREATE POLICY "Admins can view all team member data" 
ON public.team_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.users 
  WHERE users.id = auth.uid() AND users.is_admin = true
));

-- Public users should use the team_members_public view instead