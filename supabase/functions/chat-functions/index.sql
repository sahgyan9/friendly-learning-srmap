
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
  WHERE conversation_id = get_conversation_messages.conversation_id
  ORDER BY sent_at ASC;
$$;

-- RPC function to send a message and update conversation
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

-- RPC function to get all conversations for a user
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_id UUID)
RETURNS SETOF public.conversations
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.conversations
  WHERE user1_id = user_id OR user2_id = user_id
  ORDER BY last_updated DESC;
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

-- Updated verification status function to update existing mentor records
CREATE OR REPLACE FUNCTION public.update_verification_status(verification_id uuid, new_status text, admin_id uuid, reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  verification_data JSONB;
BEGIN
  -- Check if the requester is admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can update verification status';
  END IF;

  -- Update verification status and get the user data
  UPDATE public.mentor_verifications
  SET 
    status = new_status,
    reviewed_at = NOW(),
    reviewed_by = admin_id,
    rejection_reason = CASE WHEN new_status = 'rejected' THEN reason ELSE NULL END
  WHERE id = verification_id
  RETURNING user_id, application_data INTO target_user_id, verification_data;

  -- Update user verification status
  UPDATE public.users
  SET verification_status = new_status
  WHERE id = target_user_id;

  -- If approved, update the existing mentor record instead of creating new one
  IF new_status = 'approved' THEN
    -- Update the existing mentor record with application data
    UPDATE public.mentors
    SET 
      department = COALESCE(verification_data->>'department', department),
      skills = CASE 
        WHEN verification_data->>'skills' IS NOT NULL 
        THEN string_to_array(verification_data->>'skills', ',')
        ELSE skills
      END,
      bio = COALESCE(verification_data->>'bio', bio),
      linkedin_url = COALESCE(verification_data->>'linkedin_url', linkedin_url)
    WHERE id = target_user_id;
    
    -- Update user role to mentor
    UPDATE public.users
    SET role = CASE 
      WHEN role = 'student' THEN 'mentor'
      WHEN role = 'both' THEN 'both'
      ELSE 'mentor'
    END
    WHERE id = target_user_id;
  END IF;

  -- Create notification for the user
  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (
    target_user_id,
    'system',
    CASE 
      WHEN new_status = 'approved' THEN 'Mentor Application Approved!'
      WHEN new_status = 'rejected' THEN 'Mentor Application Update'
      ELSE 'Mentor Application Status Updated'
    END,
    CASE 
      WHEN new_status = 'approved' THEN 'Congratulations! Your mentor application has been approved. You can now start mentoring students.'
      WHEN new_status = 'rejected' THEN 'Your mentor application requires attention. ' || COALESCE(reason, 'Please contact support for more information.')
      ELSE 'Your mentor application status has been updated to: ' || new_status
    END
  );
END;
$$;
