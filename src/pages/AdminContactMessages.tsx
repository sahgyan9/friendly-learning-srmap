
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Clock, CheckCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { formatDistanceToNow } from "date-fns";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

const AdminContactMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching contact messages:', error);
      toast.error('Failed to load contact messages');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = (message: ContactMessage) => {
    setSelectedMessage(message);
    setResponseText(message.admin_response || "");
    setIsResponseModalOpen(true);
  };

  const handleSendResponse = async () => {
    if (!selectedMessage || !responseText.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({
          admin_response: responseText,
          responded_at: new Date().toISOString(),
          status: 'responded'
        })
        .eq('id', selectedMessage.id);

      if (error) throw error;

      toast.success('Response sent successfully');
      setIsResponseModalOpen(false);
      setSelectedMessage(null);
      setResponseText("");
      fetchMessages();
    } catch (error: any) {
      console.error('Error sending response:', error);
      toast.error('Failed to send response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsResolved = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: 'resolved' })
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Message marked as resolved');
      fetchMessages();
    } catch (error: any) {
      console.error('Error updating message status:', error);
      toast.error('Failed to update message status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default">New</Badge>;
      case 'responded':
        return <Badge variant="secondary">Responded</Badge>;
      case 'resolved':
        return <Badge variant="outline">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-8">Loading contact messages...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contact Messages</h1>
            <p className="text-muted-foreground">
              Manage and respond to user inquiries
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {messages.map((message) => (
            <Card key={message.id} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{message.subject}</CardTitle>
                      <CardDescription>
                        From: {message.name} ({message.email})
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(message.status)}
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm">{message.message}</p>
                </div>
                
                {message.admin_response && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">Admin Response:</span>
                    </div>
                    <p className="text-sm">{message.admin_response}</p>
                    {message.responded_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Responded {formatDistanceToNow(new Date(message.responded_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRespond(message)}
                  >
                    {message.admin_response ? 'Update Response' : 'Respond'}
                  </Button>
                  {message.status !== 'resolved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsResolved(message.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No contact messages found.
            </div>
          )}
        </div>

        <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Contact Message</DialogTitle>
            </DialogHeader>
            
            {selectedMessage && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Original Message:</h4>
                  <p className="text-sm mb-2"><strong>From:</strong> {selectedMessage.name} ({selectedMessage.email})</p>
                  <p className="text-sm mb-2"><strong>Subject:</strong> {selectedMessage.subject}</p>
                  <p className="text-sm">{selectedMessage.message}</p>
                </div>
                
                <div>
                  <label htmlFor="response" className="block text-sm font-medium mb-2">
                    Your Response
                  </label>
                  <Textarea
                    id="response"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={6}
                    placeholder="Type your response here..."
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsResponseModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendResponse}
                    disabled={isSubmitting || !responseText.trim()}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Response'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminContactMessages;
