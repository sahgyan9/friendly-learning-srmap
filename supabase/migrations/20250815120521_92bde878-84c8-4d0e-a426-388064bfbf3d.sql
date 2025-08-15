-- Create a security definer function to get public team member data
CREATE OR REPLACE FUNCTION public.get_team_members_public()
RETURNS TABLE (
  id uuid,
  name text,
  "position" text,
  image_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    tm.id,
    tm.name,
    tm."position",
    tm.image_url,
    tm.created_at,
    tm.updated_at
  FROM public.team_members tm;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_members_public() TO anon, authenticated;