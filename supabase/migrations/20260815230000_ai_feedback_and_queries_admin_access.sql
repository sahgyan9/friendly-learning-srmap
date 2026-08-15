-- supabase/migrations/20260815230000_ai_feedback_and_queries_admin_access.sql

-- 1. Grant SELECT policy for admins on ai_overview_feedback
DROP POLICY IF EXISTS "Admins can select feedback" ON public.ai_overview_feedback;
CREATE POLICY "Admins can select feedback" 
ON public.ai_overview_feedback 
FOR SELECT 
TO authenticated
USING (public.is_admin_user(auth.uid()));

GRANT SELECT ON TABLE public.ai_overview_feedback TO authenticated;

-- Also ensure update policy uses is_admin_user
DROP POLICY IF EXISTS "Admins can update feedback status" ON public.ai_overview_feedback;
CREATE POLICY "Admins can update feedback status" 
ON public.ai_overview_feedback 
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

GRANT UPDATE ON TABLE public.ai_overview_feedback TO authenticated;

-- 2. Grant SELECT policy for admins on search_query_cache
DROP POLICY IF EXISTS "Admins can select search queries" ON public.search_query_cache;
CREATE POLICY "Admins can select search queries" 
ON public.search_query_cache 
FOR SELECT 
TO authenticated
USING (public.is_admin_user(auth.uid()));

GRANT SELECT ON TABLE public.search_query_cache TO authenticated;
