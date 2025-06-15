
-- First, let's check what constraints already exist and only add what's missing
-- Make user IDs non-nullable where appropriate (if not already)
DO $$
BEGIN
  -- Try to make conversations user IDs non-nullable
  BEGIN
    ALTER TABLE public.conversations 
    ALTER COLUMN user1_id SET NOT NULL,
    ALTER COLUMN user2_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if already non-nullable
    NULL;
  END;

  -- Try to make messages user IDs non-nullable
  BEGIN
    ALTER TABLE public.messages 
    ALTER COLUMN sender_id SET NOT NULL,
    ALTER COLUMN receiver_id SET NOT NULL,
    ALTER COLUMN conversation_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if already non-nullable
    NULL;
  END;
END $$;

-- Enable Row Level Security (if not already enabled)
DO $$
BEGIN
  ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if already enabled
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if already enabled
  NULL;
END $$;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.conversations
FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

CREATE POLICY "Users can update their own conversations" ON public.conversations
FOR UPDATE USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);

CREATE POLICY "Users can update their own messages" ON public.messages
FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Create trigger to sync Supabase Auth users with custom users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create or replace RPC functions for conversation management
CREATE OR REPLACE FUNCTION public.get_conversation(user1 UUID, user2 UUID)
RETURNS SETOF public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.conversations
  WHERE (user1_id = user1 AND user2_id = user2)
  OR (user1_id = user2 AND user2_id = user1);
$$;

CREATE OR REPLACE FUNCTION public.create_conversation(user1_id UUID, user2_id UUID)
RETURNS public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.conversations (user1_id, user2_id)
  VALUES (user1_id, user2_id)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_messages(conversation_id UUID)
RETURNS SETOF public.messages
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.messages
  WHERE conversation_id = get_conversation_messages.conversation_id
  ORDER BY sent_at ASC;
$$;

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
