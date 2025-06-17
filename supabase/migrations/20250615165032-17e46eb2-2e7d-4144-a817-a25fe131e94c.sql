
-- Enable real-time for conversations table (messages already enabled)
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add conversations table to realtime publication (messages already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create typing_indicators table for real-time typing status
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies for typing_indicators
CREATE POLICY "Users can view typing indicators in their conversations"
  ON public.typing_indicators
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own typing indicators"
  ON public.typing_indicators
  FOR ALL
  USING (user_id = auth.uid());

-- Enable real-time for typing_indicators
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create user_presence table for online status
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for user_presence
CREATE POLICY "Users can view presence of users they have conversations with"
  ON public.user_presence
  FOR SELECT
  USING (
    user_id IN (
      SELECT CASE 
        WHEN user1_id = auth.uid() THEN user2_id
        WHEN user2_id = auth.uid() THEN user1_id
      END
      FROM public.conversations 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update their own presence"
  ON public.user_presence
  FOR ALL
  USING (user_id = auth.uid());

-- Enable real-time for user_presence
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Add delivery_status to messages table
ALTER TABLE public.messages ADD COLUMN delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read'));

-- Function to update typing indicator
CREATE OR REPLACE FUNCTION public.update_typing_indicator(
  p_conversation_id UUID,
  p_user_id UUID,
  p_is_typing BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.typing_indicators (conversation_id, user_id, is_typing, updated_at)
  VALUES (p_conversation_id, p_user_id, p_is_typing, now())
  ON CONFLICT (conversation_id, user_id) 
  DO UPDATE SET 
    is_typing = p_is_typing,
    updated_at = now();
    
  -- Clean up old typing indicators (older than 10 seconds)
  DELETE FROM public.typing_indicators 
  WHERE updated_at < now() - INTERVAL '10 seconds';
END;
$$;

-- Function to update user presence
CREATE OR REPLACE FUNCTION public.update_user_presence(
  p_user_id UUID,
  p_is_online BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, is_online, last_seen, updated_at)
  VALUES (p_user_id, p_is_online, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_online = p_is_online,
    last_seen = CASE WHEN p_is_online THEN now() ELSE user_presence.last_seen END,
    updated_at = now();
END;
$$;

-- Function to mark messages as delivered
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET delivery_status = 'delivered'
  WHERE conversation_id = p_conversation_id
    AND receiver_id = p_user_id
    AND delivery_status = 'sent';
END;
$$;

-- Update the existing mark_messages_as_read function to also update delivery status
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  conversation_id UUID,
  user_id UUID
)
RETURNS SETOF messages
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.messages
  SET 
    is_read = true,
    delivery_status = 'read'
  WHERE 
    conversation_id = mark_messages_as_read.conversation_id
    AND receiver_id = user_id
    AND is_read = false
  RETURNING *;
$$;
