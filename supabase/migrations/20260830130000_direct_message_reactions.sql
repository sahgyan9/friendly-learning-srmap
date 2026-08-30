-- Migration: Support emoji reactions on 1-on-1 direct messages
-- Adds direct_message_reactions table, toggle_direct_message_reaction RPC,
-- and upgrades get_conversation_messages to return reactions and viewer_reactions.

-- 1. Create table for direct message reactions
CREATE TABLE IF NOT EXISTS public.direct_message_reactions (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

-- 2. Enable RLS
ALTER TABLE public.direct_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View direct message reactions" ON public.direct_message_reactions;
CREATE POLICY "View direct message reactions"
ON public.direct_message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = direct_message_reactions.message_id
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

-- 3. Toggle direct message reaction RPC
DROP FUNCTION IF EXISTS public.toggle_direct_message_reaction(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.toggle_direct_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_msg public.messages;
  v_exists boolean;
  v_clean_emoji text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_clean_emoji := btrim(COALESCE(p_emoji, ''));
  IF v_clean_emoji = '' THEN
    RAISE EXCEPTION 'Emoji cannot be empty';
  END IF;

  SELECT * INTO v_msg
  FROM public.messages
  WHERE id = p_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_msg.sender_id != auth.uid() AND v_msg.receiver_id != auth.uid() THEN
    RAISE EXCEPTION 'You are not a participant in this conversation';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.direct_message_reactions
    WHERE message_id = p_message_id
      AND user_id = auth.uid()
      AND emoji = v_clean_emoji
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.direct_message_reactions
    WHERE message_id = p_message_id
      AND user_id = auth.uid()
      AND emoji = v_clean_emoji;
    RETURN false;
  ELSE
    INSERT INTO public.direct_message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, auth.uid(), v_clean_emoji)
    ON CONFLICT (message_id, user_id, emoji) DO NOTHING;
    RETURN true;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_direct_message_reaction(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_direct_message_reaction(UUID, TEXT) TO authenticated;

-- 4. Upgrade get_conversation_messages to return aggregated reactions and viewer_reactions
DROP FUNCTION IF EXISTS public.get_conversation_messages(UUID);

CREATE OR REPLACE FUNCTION public.get_conversation_messages(conversation_id UUID)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  receiver_id UUID,
  content TEXT,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN,
  delivery_status TEXT,
  reply_to_id UUID,
  is_edited BOOLEAN,
  edited_at TIMESTAMPTZ,
  reactions JSONB,
  viewer_reactions TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.sent_at,
    m.is_read,
    COALESCE(m.delivery_status, 'sent') AS delivery_status,
    m.reply_to_id,
    COALESCE(m.is_edited, false) AS is_edited,
    m.edited_at,
    COALESCE((
      SELECT jsonb_object_agg(g.emoji, g.reaction_count)
        FROM (
          SELECT emoji, count(*) AS reaction_count
            FROM public.direct_message_reactions
           WHERE message_id = m.id
           GROUP BY emoji
        ) g
    ), '{}'::jsonb) AS reactions,
    COALESCE((
      SELECT array_agg(emoji)
        FROM public.direct_message_reactions
       WHERE message_id = m.id AND user_id = auth.uid()
    ), '{}'::text[]) AS viewer_reactions
  FROM public.messages m
  WHERE m.conversation_id = get_conversation_messages.conversation_id
  ORDER BY m.sent_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_messages(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(UUID) TO authenticated;
