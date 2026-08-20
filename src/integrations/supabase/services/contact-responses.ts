import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications";

// Verify table exists and is accessible
export const verifyContactResponsesTable = async () => {
    try {
        const { data, error } = await supabase
            .from('contact_responses')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Table verification failed:', error);
            return { exists: false, error: error.message };
        }

        return { exists: true, error: null };
    } catch (error: any) {
        console.error('Table verification error:', error);
        return { exists: false, error: error.message };
    }
};

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

        // In a real application, you would integrate with an email service like:
        // - SendGrid
        // - AWS SES
        // - Mailgun
        // - Resend
        // 
        // For now, we'll create a record in our database and send a notification

        // First, get the contact message details to extract recipient info
        const { data: contactMessage, error: contactError } = await supabase
            .from('contact_messages')
            .select('name, email')
            .eq('id', response.contact_message_id)
            .single();

        if (contactError || !contactMessage) {
            console.error('Error fetching contact message:', contactError);
            throw new Error(`Failed to fetch contact message: ${contactError?.message || 'Contact message not found'}`);
        }

        // 1. Store the response in the database with recipient info
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

        // 3. Send the actual email via the send-contact-reply edge function.
        // The function re-reads subject/message/recipient itself from the row
        // we just inserted, using the service role -- this call only points at
        // which row to send, it does not carry the email content.
        try {
            const { data: emailResult, error: emailError } = await supabase.functions.invoke(
                'send-contact-reply',
                { body: { contact_response_id: responseData.id } }
            );

            if (emailError || !emailResult?.success) {
                console.warn('Email sending failed:', emailError?.message || emailResult?.error);
                // Don't throw error as response was already saved
            }
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            // Don't throw error as response was already saved to database
        }

        return { data: responseData, error: null };

    } catch (error) {
        console.error('Error sending admin response:', error);
        throw error;
    }
};

// Get all responses for a contact message
export const getContactMessageResponses = async (contactMessageId: string) => {
    try {

        // First, let's try a simple query without foreign key joins to diagnose the issue
        const { data, error } = await supabase
            .from('contact_responses')
            .select('*')
            .eq('contact_message_id', contactMessageId)
            .order('sent_at', { ascending: false });

        if (error) {
            console.error('Error fetching contact responses:', error);
            throw new Error(`Failed to fetch responses: ${error.message}`);
        }

        // If we have responses, fetch admin info separately
        if (data && data.length > 0) {
            const adminIds = [...new Set(data.map(r => r.admin_id))];
            const { data: admins, error: adminError } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', adminIds);

            if (!adminError && admins) {
                // Merge admin data with responses
                const responsesWithAdmin = data.map(response => {
                    const admin = admins.find(a => a.id === response.admin_id);
                    return {
                        ...response,
                        admin
                    };
                });

                return { data: responsesWithAdmin, error: null };
            }
        }

        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching contact responses:', error);
        return { data: [], error };
    }
};

// Get all admin responses (for admin dashboard)
export const getAllAdminResponses = async (adminId?: string) => {
    try {

        let query = supabase
            .from('contact_responses')
            .select('*')
            .order('sent_at', { ascending: false });

        if (adminId) {
            query = query.eq('admin_id', adminId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching admin responses:', error);
            throw new Error(`Failed to fetch admin responses: ${error.message}`);
        }

        // If we have responses, fetch related data separately
        if (data && data.length > 0) {
            // Get contact message info
            const messageIds = [...new Set(data.map(r => r.contact_message_id))];
            const { data: messages } = await supabase
                .from('contact_messages')
                .select('id, name, email, subject, created_at')
                .in('id', messageIds);

            // Get admin info
            const adminIds = [...new Set(data.map(r => r.admin_id))];
            const { data: admins } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', adminIds);

            // Merge all data
            const responsesWithData = data.map(response => {
                const contactMessage = messages?.find(m => m.id === response.contact_message_id);
                const admin = admins?.find(a => a.id === response.admin_id);
                return {
                    ...response,
                    contact_message: contactMessage,
                    admin
                };
            });

            return { data: responsesWithData, error: null };
        }

        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching admin responses:', error);
        return { data: [], error };
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
