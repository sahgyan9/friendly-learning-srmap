// Email service integration using Resend
// You'll need to install resend: npm install resend
// And set your RESEND_API_KEY in environment variables

interface EmailData {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

// For development/testing - logs email instead of sending
const DEV_MODE = import.meta.env.DEV || process.env.NODE_ENV === 'development';

export const sendEmail = async (emailData: EmailData) => {
    if (DEV_MODE) {
        // Development mode - just log the email
        console.log('📧 EMAIL SERVICE (DEV MODE) - Would send email:', {
            to: emailData.to,
            subject: emailData.subject,
            from: emailData.from || 'admin@friendlylearning.com',
            htmlPreview: emailData.html.substring(0, 200) + '...'
        });

        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            success: true,
            messageId: `dev-${Date.now()}`,
            message: 'Email logged successfully (development mode)'
        };
    }

    try {
        // Production mode - actually send email
        // Uncomment and configure when you have Resend API key

        /*
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
    
        const result = await resend.emails.send({
          from: emailData.from || 'Friendly Learning <admin@friendlylearning.com>',
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
        });
    
        if (result.error) {
          throw new Error(`Email service error: ${result.error.message}`);
        }
    
        return {
          success: true,
          messageId: result.data?.id,
          message: 'Email sent successfully'
        };
        */

        // For now, return mock success in production until you configure Resend
        console.log('⚠️ EMAIL SERVICE (PROD MODE) - Real email sending not configured yet');
        return {
            success: false,
            messageId: null,
            message: 'Email service not configured - please set up Resend API key'
        };

    } catch (error: any) {
        console.error('Email sending failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Alternative: Browser-based email service (opens user's email client)
export const openEmailClient = (emailData: EmailData) => {
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.html.replace(/<[^>]*>/g, '\n')); // Strip HTML for plain text
    const mailtoLink = `mailto:${emailData.to}?subject=${subject}&body=${body}`;

    window.open(mailtoLink, '_blank');

    return {
        success: true,
        messageId: `mailto-${Date.now()}`,
        message: 'Email client opened'
    };
};

export default {
    sendEmail,
    openEmailClient
};
