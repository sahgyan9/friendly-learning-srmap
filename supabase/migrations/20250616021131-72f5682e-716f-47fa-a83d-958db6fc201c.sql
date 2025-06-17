
-- Create contact_messages table for storing contact form submissions
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  admin_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on contact_messages
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all contact messages
CREATE POLICY "Admins can view all contact messages" 
  ON public.contact_messages 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update contact messages (for responses)
CREATE POLICY "Admins can update contact messages" 
  ON public.contact_messages 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Anyone can create contact messages (public contact form)
CREATE POLICY "Anyone can create contact messages" 
  ON public.contact_messages 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Function to notify admins when new contact message is received
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

-- Create trigger to notify admins of new contact messages
CREATE TRIGGER contact_message_notification
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_contact_message();
