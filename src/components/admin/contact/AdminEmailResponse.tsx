import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage } from "@/lib/errors";
import {
    Send,
    Reply,
    User,
    Mail,
    Calendar,
    MessageSquare,
    Loader2,
    Eye,
    FileText,
    Check
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { sendAdminResponse, formatEmailTemplate } from "@/integrations/supabase/services/contact-responses";
import { useAuth } from "@/context/AuthContext";
import EmailClientHelper from "./EmailClientHelper";

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'unread' | 'read' | 'responded';
    admin_notes: string | null;
    created_at: string;
}

interface AdminEmailResponseProps {
    contactMessage: ContactMessage;
    onResponseSent: () => void;
}

const AdminEmailResponse = ({ contactMessage, onResponseSent }: AdminEmailResponseProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [responseSubject, setResponseSubject] = useState(
        `Re: ${contactMessage.subject}`
    );
    const [responseMessage, setResponseMessage] = useState('');
    const { user, profile } = useAuth();

    const handleSendResponse = async () => {
        if (!user) {
            toast.error("You must be logged in to send responses");
            return;
        }

        if (!responseMessage.trim()) {
            toast.error("Please enter a response message");
            return;
        }

        setSending(true);
        try {
            await sendAdminResponse({
                contact_message_id: contactMessage.id,
                admin_id: user.id,
                subject: responseSubject,
                message: responseMessage,
                recipient_email: contactMessage.email,
                recipient_name: contactMessage.name
            });

            toast.success(`Response sent successfully to ${contactMessage.name}!`);
            setIsOpen(false);
            setResponseMessage('');
            setResponseSubject(`Re: ${contactMessage.subject}`);
            onResponseSent();
        } catch (error: unknown) {
            console.error('Error sending response:', error);
            toast.error(getErrorMessage(error, 'Failed to send response'));
        } finally {
            setSending(false);
        }
    };

    const previewEmailHtml = formatEmailTemplate(
        responseMessage,
        contactMessage.name,
        profile?.name || 'Admin'
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2" size="sm">
                        <Reply className="h-4 w-4" />
                        <span>Send Response</span>
                    </Button>
                </DialogTrigger>

                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Send className="h-5 w-5" />
                            <span>Send Email Response</span>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Email Status Notice */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start space-x-2">
                            <Mail className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                    Email Service Status
                                </p>
                                <p className="text-amber-700 dark:text-amber-300 mt-1">
                                    {import.meta.env.DEV
                                        ? 'Development mode: Responses will be logged to console and recorded in the system, but no actual emails will be sent.'
                                        : 'Email service is not configured yet. Use "Open Email Client" to send responses manually.'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original Message */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>Original Message</span>
                                </h3>

                                <Card className="bg-gray-50 dark:bg-gray-800/50">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <User className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{contactMessage.name}</span>
                                            <Badge variant="secondary">{contactMessage.status}</Badge>
                                        </div>

                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <span>{contactMessage.email}</span>
                                        </div>

                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>{format(new Date(contactMessage.created_at), 'MMM d, yyyy at h:mm a')}</span>
                                        </div>

                                        <Separator />

                                        <div>
                                            <p className="text-sm font-medium mb-2">Subject:</p>
                                            <p className="text-sm bg-white dark:bg-gray-900 p-2 rounded border">
                                                {contactMessage.subject}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2">Message:</p>
                                            <div className="text-sm bg-white dark:bg-gray-900 p-3 rounded border max-h-32 overflow-y-auto">
                                                <p className="whitespace-pre-wrap">{contactMessage.message}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Response Form */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                                <Reply className="h-4 w-4" />
                                <span>Your Response</span>
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="response-to" className="text-sm font-medium">
                                        To:
                                    </Label>
                                    <div className="mt-1 flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded border">
                                        <User className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm">{contactMessage.name} ({contactMessage.email})</span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="response-subject" className="text-sm font-medium">
                                        Subject:
                                    </Label>
                                    <Input
                                        id="response-subject"
                                        value={responseSubject}
                                        onChange={(e) => setResponseSubject(e.target.value)}
                                        placeholder="Email subject"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="response-message" className="text-sm font-medium">
                                        Message:
                                    </Label>
                                    <Textarea
                                        id="response-message"
                                        value={responseMessage}
                                        onChange={(e) => setResponseMessage(e.target.value)}
                                        placeholder="Type your response message here..."
                                        rows={8}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This message will be formatted in a professional email template.
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center space-x-3 pt-4 border-t">
                                    <Button
                                        onClick={handleSendResponse}
                                        disabled={sending || !responseMessage.trim()}
                                        className="flex items-center space-x-2"
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        <span>{sending ? 'Sending...' : 'Record Response'}</span>
                                    </Button>

                                    <EmailClientHelper
                                        contactMessage={contactMessage}
                                        responseSubject={responseSubject}
                                        responseMessage={responseMessage}
                                    />

                                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                disabled={!responseMessage.trim()}
                                                className="flex items-center space-x-2"
                                            >
                                                <Eye className="h-4 w-4" />
                                                <span>Preview Email</span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center space-x-2">
                                                    <FileText className="h-5 w-5" />
                                                    <span>Email Preview</span>
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="border rounded-lg overflow-hidden">
                                                <div
                                                    dangerouslySetInnerHTML={{ __html: previewEmailHtml }}
                                                    className="max-h-96 overflow-y-auto"
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email Templates Helper */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2 flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>Quick Templates</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResponseMessage(
                                    `Thank you for contacting us! We've received your inquiry and appreciate you taking the time to reach out.\n\n` +
                                    `We'll review your message and get back to you with a detailed response shortly.\n\n` +
                                    `Best regards,\nFriendly Learning Team`
                                )}
                                className="text-xs"
                            >
                                Acknowledgment
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResponseMessage(
                                    `Thank you for your inquiry. We'd be happy to help you with this matter.\n\n` +
                                    `[Add your specific response here]\n\n` +
                                    `If you have any further questions, please don't hesitate to reach out.\n\n` +
                                    `Best regards,\nFriendly Learning Team`
                                )}
                                className="text-xs"
                            >
                                General Response
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResponseMessage(
                                    `Thank you for reaching out to us. We need a bit more information to better assist you.\n\n` +
                                    `Could you please provide:\n- [Specific information needed]\n- [Additional details]\n\n` +
                                    `Once we have this information, we'll be able to provide you with a comprehensive response.\n\n` +
                                    `Best regards,\nFriendly Learning Team`
                                )}
                                className="text-xs"
                            >
                                Request Info
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default AdminEmailResponse;
