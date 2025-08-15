-- Migration to prevent duplicate conversations
-- Add a unique constraint to ensure no duplicate conversations exist between the same users

-- First, let's clean up any existing duplicate conversations
-- Keep only the oldest conversation for each unique pair of users
WITH conversation_pairs AS (
  SELECT 
    LEAST(user1_id, user2_id) as user_a,
    GREATEST(user1_id, user2_id) as user_b,
    MIN(id) as keep_id
  FROM public.conversations
  GROUP BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
),
conversations_to_delete AS (
  SELECT c.id
  FROM public.conversations c
  LEFT JOIN conversation_pairs cp ON (
    (LEAST(c.user1_id, c.user2_id) = cp.user_a AND GREATEST(c.user1_id, c.user2_id) = cp.user_b)
    AND c.id = cp.keep_id
  )
  WHERE cp.keep_id IS NULL
)
DELETE FROM public.conversations 
WHERE id IN (SELECT id FROM conversations_to_delete);

-- Now add a unique constraint to prevent future duplicates
-- We'll use a function-based unique index that ensures (user1, user2) and (user2, user1) are treated as the same
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_users_idx 
ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- Update the create_conversation function to handle duplicates gracefully
CREATE OR REPLACE FUNCTION public.create_conversation(user1_id UUID, user2_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_conv public.conversations;
  new_conv public.conversations;
BEGIN
  -- First check if conversation already exists
  SELECT * INTO existing_conv
  FROM public.conversations
  WHERE (conversations.user1_id = create_conversation.user1_id AND conversations.user2_id = create_conversation.user2_id)
     OR (conversations.user1_id = create_conversation.user2_id AND conversations.user2_id = create_conversation.user1_id);
  
  -- If conversation exists, return it
  IF existing_conv.id IS NOT NULL THEN
    RETURN existing_conv;
  END IF;
  
  -- If no conversation exists, create a new one
  INSERT INTO public.conversations (user1_id, user2_id)
  VALUES (user1_id, user2_id)
  RETURNING * INTO new_conv;
  
  RETURN new_conv;
EXCEPTION
  WHEN unique_violation THEN
    -- If there's a race condition and another conversation was created in parallel,
    -- fetch and return the existing one
    SELECT * INTO existing_conv
    FROM public.conversations
    WHERE (conversations.user1_id = create_conversation.user1_id AND conversations.user2_id = create_conversation.user2_id)
       OR (conversations.user1_id = create_conversation.user2_id AND conversations.user2_id = create_conversation.user1_id);
    
    RETURN existing_conv;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_conversation(UUID, UUID) TO authenticated;
