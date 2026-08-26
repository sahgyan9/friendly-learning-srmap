-- Migration: Edit and Delete Messages within 30 minutes
-- Adds is_edited and edited_at to public.messages and public.community_group_messages
-- Adds RPC functions to safely edit and delete messages within 30 minutes of sending.

-- 1. Add is_edited and edited_at to public.messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

GRANT SELECT (is_edited, edited_at) ON public.messages TO authenticated;

-- 2. Add is_edited and edited_at to public.community_group_messages
ALTER TABLE public.community_group_messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Edit Direct Message RPC
CREATE OR REPLACE FUNCTION public.edit_direct_message(
  p_message_id UUID,
  p_content TEXT
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message public.messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_message
  FROM public.messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_message.sender_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own messages';
  END IF;

  IF v_message.sent_at < (now() - INTERVAL '30 minutes') THEN
    RAISE EXCEPTION 'Messages can only be edited within 30 minutes of sending';
  END IF;

  IF btrim(COALESCE(p_content, '')) = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty';
  END IF;

  IF length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message is too long (maximum 2000 characters)';
  END IF;

  UPDATE public.messages
  SET
    content = btrim(p_content),
    is_edited = true,
    edited_at = now()
  WHERE id = p_message_id
  RETURNING * INTO v_message;

  RETURN v_message;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_direct_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_direct_message(uuid, text) TO authenticated;

-- 4. Delete Direct Message RPC
CREATE OR REPLACE FUNCTION public.delete_direct_message(
  p_message_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_message public.messages;
  v_prev_id UUID;
  v_prev_sent_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_message
  FROM public.messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_message.sender_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own messages';
  END IF;

  IF v_message.sent_at < (now() - INTERVAL '30 minutes') THEN
    RAISE EXCEPTION 'Messages can only be deleted within 30 minutes of sending';
  END IF;

  -- Delete the message
  DELETE FROM public.messages WHERE id = p_message_id;

  -- If this was the last_message on conversation, update conversation to the previous latest message
  SELECT id, sent_at INTO v_prev_id, v_prev_sent_at
  FROM public.messages
  WHERE conversation_id = v_message.conversation_id
  ORDER BY sent_at DESC
  LIMIT 1;

  UPDATE public.conversations
  SET
    last_message_id = v_prev_id,
    last_updated = COALESCE(v_prev_sent_at, last_updated)
  WHERE id = v_message.conversation_id
    AND last_message_id = p_message_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_direct_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_direct_message(uuid) TO authenticated;

-- 5. Edit Group Message RPC
CREATE OR REPLACE FUNCTION public.edit_group_message(
  p_message_id UUID,
  p_content TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_msg public.community_group_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to edit messages';
  END IF;

  SELECT * INTO v_msg
  FROM public.community_group_messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_msg.sender_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only edit your own messages';
  END IF;

  IF v_msg.created_at < (now() - INTERVAL '30 minutes') THEN
    RAISE EXCEPTION 'Messages can only be edited within 30 minutes of sending';
  END IF;

  IF btrim(COALESCE(p_content, '')) = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message is too long (maximum 2000 characters)';
  END IF;

  UPDATE public.community_group_messages
  SET
    content = btrim(p_content),
    is_edited = true,
    edited_at = now(),
    updated_at = now()
  WHERE id = p_message_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_group_message(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_group_message(uuid, text) TO authenticated;

-- 6. Delete Group Message RPC
CREATE OR REPLACE FUNCTION public.delete_group_message(
  p_message_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_msg public.community_group_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to delete messages';
  END IF;

  SELECT * INTO v_msg
  FROM public.community_group_messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_msg.sender_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own messages';
  END IF;

  IF v_msg.created_at < (now() - INTERVAL '30 minutes') THEN
    RAISE EXCEPTION 'Messages can only be deleted within 30 minutes of sending';
  END IF;

  DELETE FROM public.community_group_messages WHERE id = p_message_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_group_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_group_message(uuid) TO authenticated;

-- 7. Update list_group_messages to return is_edited and edited_at
DROP FUNCTION IF EXISTS public.list_group_messages(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.list_group_messages(
  p_community_id uuid,
  p_channel text default 'general',
  p_limit integer default 200
)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  is_owner boolean,
  is_mentor boolean,
  channel text,
  content text,
  reply_to_id uuid,
  reply_to_sender_name text,
  reply_to_content text,
  reactions jsonb,
  viewer_reactions text[],
  created_at timestamptz,
  is_edited boolean,
  edited_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.sender_id,
    coalesce(u.name, 'A student'),
    u.profile_image,
    (m.sender_id = c.owner_id),
    public.is_active_mentor(m.sender_id),
    m.channel,
    m.content,
    m.reply_to_id,
    ru.name,
    r.content,
    coalesce((
      SELECT jsonb_object_agg(g.emoji, g.reaction_count)
        FROM (
          SELECT emoji, count(*) as reaction_count
            FROM public.community_group_message_reactions
           WHERE message_id = m.id
           GROUP BY emoji
        ) g
    ), '{}'::jsonb),
    coalesce((
      SELECT array_agg(emoji)
        FROM public.community_group_message_reactions
       WHERE message_id = m.id and user_id = auth.uid()
    ), '{}'::text[]),
    m.created_at,
    coalesce(m.is_edited, false),
    m.edited_at
  FROM public.community_group_messages m
  JOIN public.communities c on c.id = m.community_id
  LEFT JOIN public.users u on u.id = m.sender_id
  LEFT JOIN public.community_group_messages r on r.id = m.reply_to_id
  LEFT JOIN public.users ru on ru.id = r.sender_id
  WHERE m.community_id = p_community_id
    AND m.channel = p_channel
    AND public.can_view_community(p_community_id, auth.uid())
  ORDER BY m.created_at asc
  LIMIT greatest(least(p_limit, 300), 1);
$$;

REVOKE ALL ON FUNCTION public.list_group_messages(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_group_messages(uuid, text, integer) TO anon, authenticated;
