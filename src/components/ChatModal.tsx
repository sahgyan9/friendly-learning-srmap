
import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { toast } from "sonner";
import { getOrCreateConversation, getConversationMessages, sendMessage } from "@/integrations/supabase/client";

// Mock authenticated user for demo purposes
// In a real app, this would come from your auth system
const MOCK_USER = {
  id: "user-123",
  name: "Current User",
  profile_image: "https://ui-avatars.com/api/?name=Current+User&background=6366F1&color=fff",
  role: "student"
};

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sent_at: string;
  is_read: boolean;
}

const ChatModal = ({ isOpen, onClose, mentor }: ChatModalProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && mentor) {
      initializeChat();
    }
  }, [isOpen, mentor]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const initializeChat = async () => {
    setLoading(true);
    try {
      // Get or create conversation
      const { data: conversation, error } = await getOrCreateConversation(
        MOCK_USER.id, 
        mentor.id
      );
      
      if (error) {
        console.error("Error initializing chat:", error);
        toast.error("Failed to initialize chat");
        return;
      }
      
      if (conversation) {
        setConversationId(conversation.id);
        
        // Get conversation messages
        const { data: messageData, error: messagesError } = await getConversationMessages(
          conversation.id
        );
        
        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
          toast.error("Failed to load messages");
          return;
        }
        
        if (messageData) {
          setMessages(messageData);
        }
      }
    } catch (err) {
      console.error("Exception initializing chat:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !conversationId) return;
    
    setSending(true);
    try {
      const { data, error } = await sendMessage(
        conversationId,
        MOCK_USER.id,
        mentor.id,
        message
      );
      
      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }
      
      if (data) {
        setMessages(prev => [...prev, data]);
        setMessage("");
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSending(false);
    }
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 h-[600px] max-h-[80vh]">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center">
            <img 
              src={mentor.profile_image} 
              alt={mentor.name} 
              className="h-10 w-10 rounded-full mr-3"
            />
            <div className="flex-1">
              <DialogTitle className="text-lg">{mentor.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{mentor.department}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-center px-4">
                <p className="text-muted-foreground mb-2">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  Start your conversation with {mentor.name} by sending a message below.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === MOCK_USER.id;
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div className="flex flex-col max-w-[75%]">
                        <div 
                          className={`p-3 rounded-lg ${
                            isMine 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 px-1">
                          {formatTime(msg.sent_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Message input */}
          <div className="p-3 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading || sending}
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={loading || sending || !message.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
