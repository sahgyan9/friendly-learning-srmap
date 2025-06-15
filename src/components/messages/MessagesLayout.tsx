
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
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
    sendMessage,
    refreshConversations
  } = useMessages(userId);

  const { isProcessingMentor } = useMentorConnection(userId, setActiveChat, refreshConversations);

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error.message || 'Failed to load conversations'}`);
      console.error("Error in Messages component:", error);
    }
  }, [error]);

  useEffect(() => {
    console.log("=== MessagesLayout Debug ===");
    console.log("Current conversations in MessagesLayout:", conversations);
    console.log("Number of conversations:", conversations.length);
    
    // Debug each conversation's user data
    conversations.forEach((conv, index) => {
      console.log(`Conversation ${index + 1}:`, {
        id: conv.id,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        user1: conv.user1,
        user2: conv.user2
      });
    });
  }, [conversations]);

  const getOtherUser = (conversation) => {
    console.log(`\n=== getOtherUser Debug ===`);
    console.log('Input conversation:', conversation);
    console.log('Current userId:', userId);
    console.log('user1_id:', conversation.user1_id);
    console.log('user2_id:', conversation.user2_id);
    console.log('user1 object:', conversation.user1);
    console.log('user2 object:', conversation.user2);

    // Determine which user is the "other" user
    const isUser1 = conversation.user1_id === userId;
    const otherUserId = isUser1 ? conversation.user2_id : conversation.user1_id;
    const otherUserData = isUser1 ? conversation.user2 : conversation.user1;
    
    console.log('Is current user user1?', isUser1);
    console.log('Other user ID:', otherUserId);
    console.log('Other user data:', otherUserData);
    
    // If we have the user data, use it
    if (otherUserData && otherUserData.name && otherUserData.name.trim() !== "") {
      console.log('Using otherUserData:', otherUserData);
      return {
        ...otherUserData,
        name: otherUserData.name.trim()
      };
    }
    
    // Fallback if user data is missing
    console.warn(`Missing user data for conversation ${conversation.id}. Other user ID: ${otherUserId}`);
    
    return {
      id: otherUserId,
      name: "User", // Better fallback than "Unknown User"
      profile_image: null,
      role: 'student'
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
      
      <ChatFooter />
    </>
  );
};

export default MessagesLayout;
