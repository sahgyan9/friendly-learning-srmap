
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ChatContainer from "@/components/chat/ChatContainer";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/use-messages";
import { useMentorConnection } from "@/hooks/use-mentor-connection";
import { formatMessageTime } from "@/utils/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MessagesHeader from "./MessagesHeader";

const MessagesLayout = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  // Use the real user ID from auth context instead of the sample user
  const userId = user?.id || "";

  const {
    conversations,
    messages,
    activeChat,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    setActiveChat,
    sendMessage
  } = useMessages(userId);

  const { isProcessingMentor } = useMentorConnection(userId, setActiveChat);

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error.message || 'Failed to load conversations'}`);
      console.error("Error in Messages component:", error);
    }
  }, [error]);

  useEffect(() => {
    console.log("Current conversations:", conversations);
  }, [conversations]);

  const getOtherUser = (conversation) => {
    const otherUser = conversation.user1_id === userId ? conversation.user2 : conversation.user1;
    
    if (!otherUser) {
      console.error(`No user data found for conversation ${conversation.id}`);
      
      return {
        id: conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id,
        name: "Unknown User",
        profile_image: null,
        role: 'student'
      };
    }
    
    // Ensure name is a trimmed string or a fallback
    const finalName = otherUser.name?.trim() || "Unknown User";
    
    return {
      ...otherUser,
      name: finalName
    };
  };

  const hasUnreadMessages = (conversationId) => {
    return messages.some(msg =>
      msg.conversation_id === conversationId &&
      msg.receiver_id === userId &&
      !msg.is_read
    );
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
      const otherUser = getOtherUser(conv);
      return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    : conversations;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          Error loading conversations: {error.message || "Unknown error"}. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!user) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          Please sign in to view your messages.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <MessagesHeader isProcessingMentor={isProcessingMentor} />
      
      <ChatContainer
        conversations={conversations}
        filteredConversations={filteredConversations}
        messages={messages}
        activeChat={activeChat}
        isLoadingConversations={isLoadingConversations}
        isLoadingMessages={isLoadingMessages}
        isSending={isSending}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUserId={userId}
        formatTime={formatMessageTime}
        getOtherUser={getOtherUser}
        setActiveChat={setActiveChat}
        hasUnreadMessages={hasUnreadMessages}
        handleSendMessage={sendMessage}
      />
    </>
  );
};

export default MessagesLayout;
