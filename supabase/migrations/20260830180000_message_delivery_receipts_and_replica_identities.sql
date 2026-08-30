-- Migration: Enable REPLICA IDENTITY FULL and enhance message delivery/read receipt RPCs
-- 1. Sets REPLICA IDENTITY FULL on public.messages and public.direct_message_reactions
--    so Supabase Realtime emits full row payloads for UPDATE and DELETE events under RLS.
-- 2. Adds mark_all_messages_delivered() and secures mark_messages_delivered() and mark_messages_as_read().

-- 1. Full replica identities for Realtime updates under RLS
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.direct_message_reactions REPLICA IDENTITY FULL;

-- 2. Secure and robust mark_messages_delivered function
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.messages
  SET delivery_status = 'delivered'
  WHERE conversation_id = p_conversation_id
    AND receiver_id = auth.uid()
    AND delivery_status = 'sent';
END;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_delivered(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered(UUID, UUID) TO authenticated;

-- 3. Function to mark all pending incoming messages for the current user as delivered
CREATE OR REPLACE FUNCTION public.mark_all_messages_delivered()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.messages
  SET delivery_status = 'delivered'
  WHERE receiver_id = auth.uid()
    AND delivery_status = 'sent';
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_messages_delivered() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_messages_delivered() TO authenticated;

-- 4. Robust mark_messages_as_read function
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  conversation_id UUID,
  user_id UUID
)
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  UPDATE public.messages
  SET 
    is_read = true,
    delivery_status = 'read'
  WHERE 
    messages.conversation_id = mark_messages_as_read.conversation_id
    AND messages.receiver_id = auth.uid()
    AND (messages.is_read = false OR messages.delivery_status != 'read')
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_messages_as_read(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO authenticated;
