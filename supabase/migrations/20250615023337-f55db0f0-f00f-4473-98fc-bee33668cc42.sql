
-- Drop the existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid, uuid, text);

-- Recreate the function with the correct parameter names and logic
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_receiver_id UUID,
  p_content TEXT
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message public.messages;
BEGIN
  -- Insert the new message
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
  VALUES (p_conversation_id, p_sender_id, p_receiver_id, p_content)
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
