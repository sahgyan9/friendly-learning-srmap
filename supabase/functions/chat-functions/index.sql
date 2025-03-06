
-- RPC function to check if a conversation exists between two users
CREATE OR REPLACE FUNCTION public.get_conversation(user1 UUID, user2 UUID)
RETURNS SETOF public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.conversations
  WHERE (user1_id = user1 AND user2_id = user2)
  OR (user1_id = user2 AND user2_id = user1);
$$;

-- RPC function to create a new conversation
CREATE OR REPLACE FUNCTION public.create_conversation(user1_id UUID, user2_id UUID)
RETURNS public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.conversations (user1_id, user2_id)
  VALUES (user1_id, user2_id)
  RETURNING *;
$$;

-- RPC function to get messages for a conversation
CREATE OR REPLACE FUNCTION public.get_conversation_messages(conversation_id UUID)
RETURNS SETOF public.messages
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.messages
  WHERE conversation_id = get_conversation_messages.conversation_id;
$$;

-- RPC function to send a message
CREATE OR REPLACE FUNCTION public.send_message(
  conversation_id UUID,
  sender_id UUID,
  receiver_id UUID,
  content TEXT
)
RETURNS public.messages
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content)
  VALUES (conversation_id, sender_id, receiver_id, content)
  RETURNING *;
$$;

-- RPC function to update conversation last_message_id and last_updated
CREATE OR REPLACE FUNCTION public.update_conversation(
  conversation_id UUID,
  message_id UUID
)
RETURNS public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.conversations
  SET 
    last_message_id = message_id,
    last_updated = NOW()
  WHERE id = conversation_id
  RETURNING *;
$$;

-- RPC function to get all conversations for a user
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_id UUID)
RETURNS SETOF public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT c.*, m.content as last_message 
  FROM public.conversations c
  LEFT JOIN public.messages m ON c.last_message_id = m.id
  WHERE c.user1_id = user_id OR c.user2_id = user_id
  ORDER BY c.last_updated DESC;
$$;

-- RPC function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  conversation_id UUID,
  user_id UUID
)
RETURNS SETOF public.messages
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.messages
  SET is_read = true
  WHERE 
    conversation_id = mark_messages_as_read.conversation_id
    AND receiver_id = user_id
    AND is_read = false
  RETURNING *;
$$;
