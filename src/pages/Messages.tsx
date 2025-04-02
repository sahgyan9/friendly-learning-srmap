
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Conversation } from "@/types/chat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
import { formatMessageTime } from "@/utils/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/use-messages";

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Use user ID from authentication, or default to demo user ID
  const userId = user?.id || "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  
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

  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const otherUser = getOtherUser(conv);
        return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  const getOtherUser = (conversation: Conversation) => {
    return conversation.user1_id === userId ? conversation.user2 : conversation.user1;
  };

  const hasUnreadMessages = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return false;
    
    // Check if the last message is from the other user and is unread
    return (
      conversation.last_message &&
      conversation.last_message.receiver_id === userId && 
      !conversation.last_message.is_read
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <Alert className="mb-4">
              <AlertDescription>
                Please sign in to view your messages.
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <ChatFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <h1 className="text-3xl font-bold mb-8">Messages</h1>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Error loading conversations: {error.message || "Unknown error"}. Please try again later.
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <ChatFooter />
      </div>
    );
  }

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
            currentUserId={userId}
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
