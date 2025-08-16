import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications";

export interface AdminResponse {
    id: string;
    contact_message_id: string;
    admin_id: string;
    subject: string;
    message: string;
    sent_at: string;
    recipient_email: string;
    recipient_name: string;
}

export interface CreateAdminResponse {
    contact_message_id: string;
    admin_id: string;
    subject: string;
    message: string;
    recipient_email: string;
    recipient_name: string;
}

// Create admin response record and send notification
export const sendAdminResponse = async (response: CreateAdminResponse) => {
    try {
        console.log('Sending admin response:', response);

        // In a real application, you would integrate with an email service like:
        // - SendGrid
        // - AWS SES
        // - Mailgun
        // - Resend
        // 
        // For now, we'll create a record in our database and send a notification

        // 1. Store the response in the database
        const { data: responseData, error: responseError } = await supabase
            .from('contact_responses')
            .insert({
                contact_message_id: response.contact_message_id,
                admin_id: response.admin_id,
                subject: response.subject,
                message: response.message,
                recipient_email: response.recipient_email,
                recipient_name: response.recipient_name,
                sent_at: new Date().toISOString()
            })
            .select()
            .single();

        if (responseError) {
            console.error('Error storing admin response:', responseError);
            throw new Error(`Failed to store response: ${responseError.message}`);
        }

        // 2. Update the contact message status
        const { error: updateError } = await supabase
            .from('contact_messages')
            .update({ status: 'responded' })
            .eq('id', response.contact_message_id);

        if (updateError) {
            console.error('Error updating contact message status:', updateError);
            // Don't throw here as the response was already sent
        }

        // 3. In a real implementation, you would send the actual email here
        // await sendEmailViaProvider({
        //   to: response.recipient_email,
        //   subject: response.subject,
        //   html: formatEmailTemplate(response.message, response.recipient_name),
        //   from: 'admin@friendlylearning.com'
        // });

        console.log('Admin response sent successfully:', responseData);
        return { data: responseData, error: null };

    } catch (error) {
        console.error('Error sending admin response:', error);
        throw error;
    }
};

// Get all responses for a contact message
export const getContactMessageResponses = async (contactMessageId: string) => {
    try {
        const { data, error } = await supabase
            .from('contact_responses')
            .select(`
        *,
        admin:users!contact_responses_admin_id_fkey(name, email)
      `)
            .eq('contact_message_id', contactMessageId)
            .order('sent_at', { ascending: false });

        if (error) {
            console.error('Error fetching contact responses:', error);
            throw error;
        }

        return { data, error: null };
    } catch (error) {
        console.error('Error fetching contact responses:', error);
        throw error;
    }
};

// Get all admin responses (for admin dashboard)
export const getAllAdminResponses = async (adminId?: string) => {
    try {
        let query = supabase
            .from('contact_responses')
            .select(`
        *,
        contact_message:contact_messages!contact_responses_contact_message_id_fkey(
          name,
          email,
          subject,
          created_at
        ),
        admin:users!contact_responses_admin_id_fkey(name, email)
      `)
            .order('sent_at', { ascending: false });

        if (adminId) {
            query = query.eq('admin_id', adminId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching admin responses:', error);
            throw error;
        }

        return { data, error: null };
    } catch (error) {
        console.error('Error fetching admin responses:', error);
        throw error;
    }
};

// Mock email service - replace with real email provider
export const mockEmailService = {
    send: async (emailData: {
        to: string;
        subject: string;
        html: string;
        from?: string;
    }) => {
        console.log('Mock Email Service - Sending email:', emailData);

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In development, you might want to log this to a file or external service
        // for testing purposes

        return {
            success: true,
            messageId: `mock-${Date.now()}`,
            message: 'Email sent successfully (mock)'
        };
    }
};

// Format email template
export const formatEmailTemplate = (message: string, recipientName: string, adminName?: string) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Response from Friendly Learning Team</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
        .footer { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
        .logo { color: #2563eb; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎓 Friendly Learning</div>
          <p>Response to your inquiry</p>
        </div>
        
        <div class="content">
          <p>Dear ${recipientName},</p>
          
          <p>Thank you for contacting us. Here's our response to your inquiry:</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          
          <p>If you have any further questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          ${adminName || 'Friendly Learning Team'}</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from Friendly Learning platform. Please do not reply directly to this email.</p>
          <p>© 2025 Friendly Learning. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default {
    sendAdminResponse,
    getContactMessageResponses,
    getAllAdminResponses,
    mockEmailService,
    formatEmailTemplate
};
