
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Mentor } from "@/types/mentor";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/context/AuthContext";
import ChatModalHeader from "./ChatModalHeader";
import ChatModalContent from "./ChatModalContent";
import ChatModalError from "./ChatModalError";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: Mentor;
}

const ChatModal = ({ isOpen, onClose, mentor }: ChatModalProps) => {
  const { user } = useAuth();
  
  const userId = user?.id || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"; // Fallback for demo
  
  const {
    messages,
    loading,
    sending,
    error,
    conversationId,
    initializeChat,
    handleSendMessage,
  } = useChat(userId, mentor.id);
  
  const handleRetry = () => {
    initializeChat();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 h-[600px] max-h-[80vh]">
        <ChatModalHeader mentor={mentor} onClose={onClose} />
        
        <div className="flex flex-col h-full">
          {error ? (
            <ChatModalError error={error} onRetry={handleRetry} />
          ) : (
            <ChatModalContent 
              messages={messages}
              loading={loading}
              sending={sending}
              currentUserId={userId}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
