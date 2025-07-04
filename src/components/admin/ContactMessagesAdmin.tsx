
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mail, Calendar, User, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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

const ContactMessagesAdmin = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchContactMessages();
    }
  }, [user]);

  const fetchContactMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contact messages:', error);
        toast.error('Failed to load contact messages');
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      toast.error('Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: string, notes?: string) => {
    setUpdating(true);
    try {
      const updateData: any = { status };
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('contact_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message:', error);
        toast.error('Failed to update message');
        return;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: status as any, admin_notes: notes || msg.admin_notes }
          : msg
      ));

      toast.success('Message updated successfully');
      setSelectedMessage(null);
      setAdminNotes("");
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewMessage = (message: ContactMessage) => {
    setSelectedMessage(message);
    setAdminNotes(message.admin_notes || "");
    
    // Mark as read if it's unread
    if (message.status === 'unread') {
      updateMessageStatus(message.id, 'read');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-red-500';
      case 'read': return 'bg-yellow-500';
      case 'responded': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading contact messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contact Messages</h2>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Unread: {messages.filter(m => m.status === 'unread').length}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            Read: {messages.filter(m => m.status === 'read').length}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Responded: {messages.filter(m => m.status === 'responded').length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No contact messages yet</p>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card 
                key={message.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selectedMessage?.id === message.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleViewMessage(message)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {message.name}
                        <Badge className={`${getStatusColor(message.status)} text-white text-xs`}>
                          {message.status}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {message.email}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(message.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="font-medium text-sm mb-2">{message.subject}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.message}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="sticky top-6">
          {selectedMessage ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">From:</label>
                  <p className="text-sm">{selectedMessage.name} ({selectedMessage.email})</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Subject:</label>
                  <p className="text-sm">{selectedMessage.subject}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Message:</label>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">
                    {selectedMessage.message}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Received:</label>
                  <p className="text-sm">
                    {format(new Date(selectedMessage.created_at), 'MMM d, yyyy at h:mm a')}
                  </p>
                </div>

                <div>
                  <label htmlFor="admin-notes" className="text-sm font-medium block mb-2">
                    Admin Notes:
                  </label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this message..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => updateMessageStatus(selectedMessage.id, 'read', adminNotes)}
                    disabled={updating}
                    variant="outline"
                    size="sm"
                  >
                    Mark as Read
                  </Button>
                  <Button
                    onClick={() => updateMessageStatus(selectedMessage.id, 'responded', adminNotes)}
                    disabled={updating}
                    size="sm"
                  >
                    Mark as Responded
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a message to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactMessagesAdmin;
