
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MessageNotificationRequest {
  recipient_email: string;
  recipient_name: string;
  sender_name: string;
  message_content: string;
  conversation_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipient_email, 
      recipient_name, 
      sender_name, 
      message_content, 
      conversation_id 
    }: MessageNotificationRequest = await req.json();

    // Truncate message content for preview
    const messagePreview = message_content.length > 100 
      ? message_content.substring(0, 100) + "..." 
      : message_content;

    const conversationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').replace('supabase.co', 'vercel.app') || 'https://your-app.vercel.app'}/messages?chat=${conversation_id}`;

    const emailResponse = await resend.emails.send({
      from: "Friendly Learning <no-reply@friendlylearning.com>",
      to: [recipient_email],
      subject: `New message from ${sender_name}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message - Friendly Learning</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Friendly Learning</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #667eea; margin-top: 0;">Hi ${recipient_name}! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              You have a new message from <strong>${sender_name}</strong>:
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <p style="margin: 0; font-style: italic; color: #555;">
                "${messagePreview}"
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${conversationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        display: inline-block;
                        transition: transform 0.2s;">
                Reply Now
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #666; text-align: center; margin-bottom: 10px;">
              Don't want to receive these emails? 
              <a href="${conversationUrl.replace('/messages', '/profile')}" style="color: #667eea; text-decoration: none;">
                Update your notification preferences
              </a>
            </p>
            
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              © 2024 Friendly Learning. Connecting students and mentors worldwide.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Message notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending message notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
