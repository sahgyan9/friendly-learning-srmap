import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatEmailTemplate } from "@/integrations/supabase/services/contact-responses";

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
}

interface EmailClientHelperProps {
    contactMessage: ContactMessage;
    responseSubject: string;
    responseMessage: string;
}

const EmailClientHelper = ({ contactMessage, responseSubject, responseMessage }: EmailClientHelperProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const openEmailClient = () => {
        const subject = encodeURIComponent(responseSubject);
        const plainTextMessage = responseMessage.replace(/\n/g, '%0D%0A');
        const body = encodeURIComponent(plainTextMessage);
        const mailtoLink = `mailto:${contactMessage.email}?subject=${subject}&body=${body}`;

        window.open(mailtoLink, '_self');
        toast.success('Email client opened with pre-filled response');
    };

    const copyEmailContent = async () => {
        const emailContent = `To: ${contactMessage.email}
Subject: ${responseSubject}

Dear ${contactMessage.name},

${responseMessage}

Best regards,
Friendly Learning Team`;

        try {
            await navigator.clipboard.writeText(emailContent);
            toast.success('Email content copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy email content');
        }
    };

    const htmlPreview = formatEmailTemplate(responseMessage, contactMessage.name);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Open Email Client</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Mail className="h-5 w-5" />
                        <span>Send Email Manually</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Since automated email sending is not configured, you can use your email client to send this response manually.
                        </p>
                    </div>

                    {/* Email Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-medium">To:</Label>
                            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                                {contactMessage.email}
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Recipient:</Label>
                            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                                {contactMessage.name}
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Subject:</Label>
                        <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                            {responseSubject}
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Message:</Label>
                        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded border max-h-40 overflow-y-auto">
                            <pre className="text-sm whitespace-pre-wrap font-sans">
                                {responseMessage}
                            </pre>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            onClick={openEmailClient}
                            className="flex-1 flex items-center justify-center space-x-2"
                        >
                            <ExternalLink className="h-4 w-4" />
                            <span>Open Email Client</span>
                        </Button>

                        <Button
                            variant="outline"
                            onClick={copyEmailContent}
                            className="flex items-center space-x-2"
                        >
                            <Copy className="h-4 w-4" />
                            <span>Copy Content</span>
                        </Button>
                    </div>

                    {/* Instructions */}
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Option 1:</strong> Click "Open Email Client" to open your default email application with the message pre-filled.</p>
                        <p><strong>Option 2:</strong> Click "Copy Content" and paste it into any email service (Gmail, Outlook, etc.).</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmailClientHelper;
