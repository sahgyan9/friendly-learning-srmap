
-- Add email notification preferences to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_frequency text DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never'));

-- Create function to send email notification when new message is created
CREATE OR REPLACE FUNCTION public.notify_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recipient_email text;
  recipient_name text;
  sender_name text;
  email_enabled boolean;
BEGIN
  -- Get recipient email and notification preferences
  SELECT u.email, u.name, u.email_notifications
  INTO recipient_email, recipient_name, email_enabled
  FROM public.users u
  WHERE u.id = NEW.receiver_id;
  
  -- Get sender name
  SELECT u.name
  INTO sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;
  
  -- Only send email if user has email notifications enabled
  IF email_enabled = true AND recipient_email IS NOT NULL THEN
    -- Call the edge function to send email
    PERFORM
      net.http_post(
        url := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/send-message-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.jwt_token', true)
        ),
        body := jsonb_build_object(
          'recipient_email', recipient_email,
          'recipient_name', recipient_name,
          'sender_name', sender_name,
          'message_content', NEW.content,
          'conversation_id', NEW.conversation_id
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to fire after message insert
DROP TRIGGER IF EXISTS on_message_created_email_notification ON public.messages;
CREATE TRIGGER on_message_created_email_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.notify_message_email();
