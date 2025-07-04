
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Initialize the Supabase client
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message } = await req.json();
    
    if (!name || !email || !subject || !message) {
      throw new Error('All fields are required');
    }

    // Insert the contact message into the database
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        subject,
        message,
        status: 'unread'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting contact message:', error);
      throw new Error('Failed to save contact message');
    }

    console.log('Contact message saved successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contact message sent successfully',
        data 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in contact-form function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while sending your message' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
