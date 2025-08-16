import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    History,
    Mail,
    Calendar,
    User,
    MessageSquare,
    Eye,
    Send,
    RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getContactMessageResponses, AdminResponse } from "@/integrations/supabase/services/contact-responses";

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

interface ResponseHistoryProps {
    contactMessage: ContactMessage;
}

const ResponseHistory = ({ contactMessage }: ResponseHistoryProps) => {
    const [responses, setResponses] = useState<AdminResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedResponse, setSelectedResponse] = useState<AdminResponse | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    const fetchResponses = async () => {
        try {
            setLoading(true);
            const result = await getContactMessageResponses(contactMessage.id);
            if (result.data) {
                setResponses(result.data);
            }
        } catch (error: any) {
            console.error('Error fetching responses:', error);
            toast.error('Failed to load response history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResponses();
    }, [contactMessage.id]);

    const handleViewResponse = (response: AdminResponse) => {
        setSelectedResponse(response);
        setDetailDialogOpen(true);
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading response history...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <History className="h-5 w-5" />
                            <span>Response History</span>
                            <Badge variant="secondary" className="text-xs">
                                {responses.length}
                            </Badge>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchResponses}
                            className="flex items-center space-x-1"
                        >
                            <RefreshCw className="h-3 w-3" />
                            <span>Refresh</span>
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {responses.length === 0 ? (
                        <div className="text-center py-8">
                            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No responses sent yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Send your first response to this contact message
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-96">
                            <div className="space-y-4">
                                {responses.map((response, index) => (
                                    <div key={response.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <User className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium">
                                                        {(response as any).admin?.name || 'Admin'}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        Response #{responses.length - index}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                        {format(new Date(response.sent_at), 'MMM d, yyyy at h:mm a')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span>Sent to: {response.recipient_email}</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewResponse(response)}
                                                className="flex items-center space-x-1"
                                            >
                                                <Eye className="h-3 w-3" />
                                                <span>View</span>
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-xs font-medium text-muted-foreground">Subject:</span>
                                                <p className="text-sm mt-1">{response.subject}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-medium text-muted-foreground">Message Preview:</span>
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {response.message.length > 100
                                                        ? `${response.message.substring(0, 100)}...`
                                                        : response.message
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Response Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Response Details</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedResponse && (
                        <div className="space-y-6">
                            {/* Response Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Sent By:</label>
                                    <p className="mt-1">{(selectedResponse as any).admin?.name || 'Admin'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Sent At:</label>
                                    <p className="mt-1">{format(new Date(selectedResponse.sent_at), 'MMM d, yyyy at h:mm a')}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Recipient:</label>
                                    <p className="mt-1">{selectedResponse.recipient_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Email:</label>
                                    <p className="mt-1">{selectedResponse.recipient_email}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Email Content */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Subject:</label>
                                    <p className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                                        {selectedResponse.subject}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Message:</label>
                                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded border">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {selectedResponse.message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <Send className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Email sent successfully
                                    </span>
                                </div>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    This response was delivered to the recipient's email address.
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ResponseHistory;
