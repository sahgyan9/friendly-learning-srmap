
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Conversation } from "@/types/chat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
import { useMessages } from "@/hooks/use-messages";
import { formatMessageTime } from "@/utils/date-utils";

// Mock authenticated user for demo purposes
const MOCK_USER = {
  id: "user-123",
  name: "Current User",
  profile_image: "https://ui-avatars.com/api/?name=Current+User&background=6366F1&color=fff"
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
    setActiveChat,
    sendMessage
  } = useMessages(MOCK_USER.id);

  const getOtherUser = (conversation: Conversation) => {
    return conversation.user1_id === MOCK_USER.id ? conversation.user2 : conversation.user1;
  };

  const hasUnreadMessages = (conversationId: string) => {
    return messages.some(msg => 
      msg.conversation_id === conversationId && 
      msg.receiver_id === MOCK_USER.id && 
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
            currentUserId={MOCK_USER.id}
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
