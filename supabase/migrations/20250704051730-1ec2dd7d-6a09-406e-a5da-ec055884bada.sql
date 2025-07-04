
-- Create table for contact form messages
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded')),
  admin_notes TEXT
);

-- Enable RLS for contact messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow admins to see all contact messages
CREATE POLICY "Admins can view all contact messages" 
  ON public.contact_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Allow admins to update contact messages (mark as read, add notes)
CREATE POLICY "Admins can update contact messages" 
  ON public.contact_messages 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Allow anyone to create contact messages (for the contact form)
CREATE POLICY "Anyone can create contact messages" 
  ON public.contact_messages 
  FOR INSERT 
  WITH CHECK (true);

-- Update the existing ai_conversations table to store complete conversation history
ALTER TABLE public.ai_conversations 
ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'ai')),
ADD COLUMN IF NOT EXISTS suggested_mentors JSONB;

-- Create notification for admins when new contact message is received
CREATE OR REPLACE FUNCTION public.notify_admin_contact_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Create notifications for all admin users
  FOR admin_user IN 
    SELECT id FROM public.users WHERE is_admin = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
      admin_user.id,
      'system',
      'New Contact Message',
      'A new contact message has been received from ' || NEW.name || '.',
      jsonb_build_object(
        'contact_message_id', NEW.id,
        'sender_name', NEW.name,
        'sender_email', NEW.email,
        'subject', NEW.subject
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for contact message notifications
CREATE TRIGGER trigger_notify_admin_contact_message
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_contact_message();
