
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { Message } from "@/types/chat";
import { toast } from "sonner";
import { getOrCreateConversation, getConversationMessages, sendMessage } from "@/integrations/supabase/client";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";

// Mock authenticated user for demo purposes
// In a real app, this would come from your auth system
// Using the sample user ID from the Messages page to ensure compatibility
const MOCK_USER = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // Using valid UUID format from Messages page
  name: "John Student",
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
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && mentor) {
      initializeChat();
    }
  }, [isOpen, mentor]);
  
  const initializeChat = async () => {
    setLoading(true);
    setError(null);
    try {
      // This is a demo implementation - in a real app, you would need proper authentication
      // For demo purposes, we simulate a conversation initialization
      console.log("Initializing chat between:", MOCK_USER.id, "and", mentor.id);
      
      // Generate a UUID for the simulated conversation to ensure UUID compatibility
      // We're using a fixed UUID for demo consistency
      const simulatedConversationId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
      setConversationId(simulatedConversationId);
      
      // Try to get or create a real conversation (for when proper auth is implemented)
      try {
        const { data: conversation, error } = await getOrCreateConversation(
          MOCK_USER.id, 
          mentor.id
        );
        
        if (error) {
          console.error("Error initializing chat:", error);
          if (error.message.includes("row-level security")) {
            console.log("Row-level security error detected - using simulated conversation for demo");
          } else {
            toast.error("Failed to initialize chat");
            setError("Failed to initialize chat. Please try again later.");
          }
        } else if (conversation) {
          // If we somehow get a conversation (e.g., RLS is disabled), use it
          setConversationId(conversation.id);
          
          try {
            const { data: messageData, error: messagesError } = await getConversationMessages(
              conversation.id
            );
            
            if (messagesError) {
              console.error("Error fetching messages:", messagesError);
            } else if (messageData) {
              setMessages(messageData);
            }
          } catch (err) {
            console.error("Exception fetching messages:", err);
          }
        }
      } catch (err) {
        console.error("Exception initializing chat:", err);
        setError("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (content: string) => {
    if (!conversationId) return;
    
    setSending(true);
    try {
      // Add the message to the local state for immediate UI feedback
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: MOCK_USER.id,
        receiver_id: mentor.id,
        content: content,
        sent_at: new Date().toISOString(),
        is_read: false
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Try to send the message to the real backend
      // This is likely to fail due to RLS, but we try anyway for when auth is implemented
      try {
        const { data, error } = await sendMessage(
          conversationId,
          MOCK_USER.id,
          mentor.id,
          content
        );
        
        if (error) {
          console.error("Error sending message:", error);
          if (error.message.includes("row-level security")) {
            console.log("Row-level security error detected - message added locally for demo");
          } else if (error.message.includes("invalid input syntax for type uuid")) {
            console.log("UUID format error - message added locally for demo");
          } else {
            toast.error("Failed to send message to server");
          }
        }
      } catch (err) {
        console.error("Exception sending message:", err);
      }
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
          {error ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <Button variant="outline" onClick={initializeChat}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                  disabled={loading || !!error}
                  sending={sending}
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
