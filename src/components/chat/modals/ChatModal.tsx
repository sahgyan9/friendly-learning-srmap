
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/use-messages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ChatModalHeader from "./ChatModalHeader";
import ChatModalContent from "./ChatModalContent";
import ChatModalError from "./ChatModalError";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  receiverImage?: string;
}

const ChatModal = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  receiverImage,
}: ChatModalProps) => {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    activeChat,
    isLoadingMessages,
    isSending,
    error,
    setActiveChat,
    sendMessage,
  } = useMessages(user?.id || "");

  React.useEffect(() => {
    if (isOpen && user?.id && receiverId) {
      // Find or create conversation with the receiver
      const existingConversation = conversations.find(
        (conv) =>
          (conv.user1_id === user.id && conv.user2_id === receiverId) ||
          (conv.user1_id === receiverId && conv.user2_id === user.id)
      );

      if (existingConversation) {
        setActiveChat(existingConversation.id);
      } else {
        // Create a temporary conversation ID for new conversations
        const tempConversationId = `temp-${user.id}-${receiverId}`;
        setActiveChat(tempConversationId);
      }
    }
  }, [isOpen, user?.id, receiverId, conversations, setActiveChat]);

  const handleSendMessage = async (content: string) => {
    if (!user?.id || !receiverId) return;
    await sendMessage(content);
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">
            Chat with {receiverName}
          </DialogTitle>
          <ChatModalHeader
            receiverName={receiverName}
            receiverImage={receiverImage}
            onClose={onClose}
          />
        </DialogHeader>

        {error ? (
          <ChatModalError error={error} />
        ) : (
          <ChatModalContent
            messages={messages}
            loading={isLoadingMessages}
            sending={isSending}
            currentUserId={user.id}
            conversationId={activeChat}
            onSendMessage={handleSendMessage}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;
