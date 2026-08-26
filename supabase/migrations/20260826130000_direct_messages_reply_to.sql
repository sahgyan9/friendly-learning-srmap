-- Migration: Support replying to messages in 1-on-1 direct conversations
-- Adds reply_to_id column to public.messages with foreign key to public.messages(id).

-- 1. Add reply_to_id column
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- 2. Create index for fast reply lookup
CREATE INDEX IF NOT EXISTS messages_reply_to_id_idx ON public.messages (reply_to_id);

-- 3. Grant column-level SELECT on the new column to authenticated users
GRANT SELECT (reply_to_id) ON public.messages TO authenticated;

-- 4. Update send_message RPC to accept optional p_reply_to_id parameter
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid, uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT,
  p_reply_to_id UUID DEFAULT NULL
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_message public.messages;
BEGIN
  -- Insert the new message
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, reply_to_id)
  VALUES (p_conversation_id, p_sender_id, p_receiver_id, p_content, p_reply_to_id)
  RETURNING * INTO new_message;

  -- Update the conversation's last message and timestamp
  UPDATE public.conversations
  SET 
    last_message_id = new_message.id,
    last_updated = new_message.sent_at
  WHERE id = p_conversation_id;

  -- Return the newly created message
  RETURN new_message;
END;
$$;

-- 5. Ensure get_conversation_messages returns full messages with reply_to_id
CREATE OR REPLACE FUNCTION public.get_conversation_messages(conversation_id UUID)
RETURNS SETOF public.messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.messages
  WHERE conversation_id = get_conversation_messages.conversation_id
  ORDER BY sent_at ASC;
$$;

-- 6. Restrict permissions: authenticated users only
REVOKE ALL ON FUNCTION public.send_message(uuid, uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, uuid, uuid, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_conversation_messages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO authenticated;

