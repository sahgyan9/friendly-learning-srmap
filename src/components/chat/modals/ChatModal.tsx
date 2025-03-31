
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Mentor } from "@/types/mentor";
import { useChat } from "@/hooks/use-chat";
import ChatModalHeader from "./ChatModalHeader";
import ChatModalContent from "./ChatModalContent";
import ChatModalError from "./ChatModalError";

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
  const {
    messages,
    loading,
    sending,
    error,
    conversationId,
    initializeChat,
    handleSendMessage,
  } = useChat(MOCK_USER.id, mentor.id);
  
  useEffect(() => {
    if (isOpen && mentor) {
      initializeChat();
    }
  }, [isOpen, mentor]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 h-[600px] max-h-[80vh]">
        <ChatModalHeader mentor={mentor} onClose={onClose} />
        
        <div className="flex flex-col h-full">
          {error ? (
            <ChatModalError error={error} onRetry={initializeChat} />
          ) : (
            <ChatModalContent 
              messages={messages}
              loading={loading}
              sending={sending}
              currentUserId={MOCK_USER.id}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
