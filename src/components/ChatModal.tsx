
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { Message } from "@/types/chat";
import { toast } from "sonner";
import { getOrCreateConversation, getConversationMessages, sendMessage } from "@/integrations/supabase/client";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";

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

const ChatModal = ({ isOpen, onClose, mentor }: ChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && mentor) {
      initializeChat();
    }
  }, [isOpen, mentor]);
  
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
  
  const handleSendMessage = async (content: string) => {
    if (!conversationId) return;
    
    setSending(true);
    try {
      const { data, error } = await sendMessage(
        conversationId,
        MOCK_USER.id,
        mentor.id,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }
      
      if (data) {
        setMessages(prev => [...prev, data]);
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setSending(false);
    }
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
            <MessageList 
              messages={messages} 
              loading={loading} 
              currentUserId={MOCK_USER.id}
            />
          </div>
          
          {/* Message input */}
          <div className="p-3 border-t">
            <MessageInput 
              onSendMessage={handleSendMessage}
              disabled={loading}
              sending={sending}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
