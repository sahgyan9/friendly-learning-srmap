
-- 1. Fix users table public exposure
DROP POLICY IF EXISTS "Allow read of public profile fields for comments" ON public.users;

-- Create a safe public view exposing only non-sensitive fields
DROP VIEW IF EXISTS public.users_public CASCADE;
CREATE VIEW public.users_public AS
SELECT
  id,
  name,
  profile_image,
  role,
  department,
  skills,
  bio,
  linkedin_url,
  is_available,
  created_at
FROM public.users;

GRANT SELECT ON public.users_public TO anon, authenticated;

-- 2. Lock down notifications inserts
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create notifications for themselves"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can create notifications for any user"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- 3. Recreate team_members_public view without SECURITY DEFINER
DROP VIEW IF EXISTS public.team_members_public CASCADE;
CREATE VIEW public.team_members_public AS
SELECT
  id,
  name,
  position,
  image_url,
  created_at,
  updated_at
FROM public.team_members;

GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- 4. Set fixed search_path on functions missing it
ALTER FUNCTION public.handle_updated_at_contact_responses() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_admin_contact_message() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_post_likes_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_post_comments_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_message_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_canvas_session(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_canvas_session(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_session_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.join_canvas_session(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_canvas_session_participants(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_mentor_left() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_all_messages() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_user_rate_mentor(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_mentor_reviews(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_conversation(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_conversation(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_conversation_messages(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_messages_as_read(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.send_message(uuid, uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_badge_award() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_admin_mentor_application() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_typing_indicator(uuid, uuid, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_user_presence(uuid, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.mark_messages_delivered(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_mentor_review_change() SET search_path = public, pg_temp;
