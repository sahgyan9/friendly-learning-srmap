
-- Enable the HTTP extension for making external API calls
CREATE EXTENSION IF NOT EXISTS http;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_message_created_email_notification ON public.messages;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.notify_message_email();

-- Create improved email notification function with better error handling
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
  email_frequency text;
  should_send_email boolean := false;
  function_url text;
  request_body jsonb;
  response_result http_response;
BEGIN
  -- Get recipient email and notification preferences
  SELECT u.email, u.name, u.email_notifications, u.email_frequency
  INTO recipient_email, recipient_name, email_enabled, email_frequency
  FROM public.users u
  WHERE u.id = NEW.receiver_id;
  
  -- Get sender name
  SELECT u.name
  INTO sender_name
  FROM public.users u
  WHERE u.id = NEW.sender_id;
  
  -- Determine if we should send email based on user preferences
  IF email_enabled = true AND recipient_email IS NOT NULL AND sender_name IS NOT NULL THEN
    CASE email_frequency
      WHEN 'immediate' THEN
        should_send_email := true;
      WHEN 'never' THEN
        should_send_email := false;
      ELSE
        -- For 'daily' and 'weekly', we'll send immediate for now
        -- In a production system, you'd implement batching
        should_send_email := true;
    END CASE;
  END IF;
  
  -- Only attempt to send email if conditions are met
  IF should_send_email THEN
    BEGIN
      -- Construct the edge function URL
      function_url := 'https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/send-message-notification';
      
      -- Prepare request body
      request_body := jsonb_build_object(
        'recipient_email', recipient_email,
        'recipient_name', recipient_name,
        'sender_name', sender_name,
        'message_content', NEW.content,
        'conversation_id', NEW.conversation_id
      );
      
      -- Make HTTP request to edge function
      SELECT * INTO response_result
      FROM http_post(
        function_url,
        request_body::text,
        'application/json',
        ARRAY[
          http_header('Authorization', 'Bearer ' || current_setting('app.jwt_token', true)),
          http_header('apikey', current_setting('app.api_key', true))
        ]
      );
      
      -- Log the response (optional, for debugging)
      IF response_result.status >= 400 THEN
        RAISE NOTICE 'Email notification failed with status %: %', response_result.status, response_result.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE NOTICE 'Email notification error: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (after insert, not blocking)
CREATE TRIGGER on_message_created_email_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_email();
