
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Conversation } from "@/types/chat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
import { useMessages } from "@/hooks/use-messages";
import { formatMessageTime } from "@/utils/date-utils";

// Use the sample user we created in Supabase
const SAMPLE_USER = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // John Student
  name: "John Student",
  profile_image: "https://ui-avatars.com/api/?name=John+Student&background=6366F1&color=fff"
};

const Messages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
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
  } = useMessages(SAMPLE_USER.id);

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error.message || 'Failed to load conversations'}`);
      console.error("Error in Messages component:", error);
    }
  }, [error]);

  useEffect(() => {
    console.log("Current conversations:", conversations);
  }, [conversations]);

  const getOtherUser = (conversation: Conversation) => {
    return conversation.user1_id === SAMPLE_USER.id ? conversation.user2 : conversation.user1;
  };

  const hasUnreadMessages = (conversationId: string) => {
    return messages.some(msg => 
      msg.conversation_id === conversationId && 
      msg.receiver_id === SAMPLE_USER.id && 
      !msg.is_read
    );
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const otherUser = getOtherUser(conv);
        return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <h1 className="text-3xl font-bold mb-8">Messages</h1>
          
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
            currentUserId={SAMPLE_USER.id}
            formatTime={formatMessageTime}
            getOtherUser={getOtherUser}
            setActiveChat={setActiveChat}
            hasUnreadMessages={hasUnreadMessages}
            handleSendMessage={sendMessage}
          />
        </div>
      </main>
      
      <ChatFooter />
    </div>
  );
};

export default Messages;
