import { useState, useEffect } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/use-messages";
import { formatMessageTime } from "@/utils/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const Messages = () => {
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

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error.message || 'Failed to load conversations'}`);
      console.error("Error in Messages component:", error);
    }
  }, [error]);

  useEffect(() => {
    console.log("Current conversations in Messages:", conversations);
    conversations.forEach(conv => {
      console.log(`Conversation ${conv.id}:`, {
        user1: conv.user1,
        user2: conv.user2,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id
      });
    });
  }, [conversations]);

  const getOtherUser = (conversation) => {
    console.log(`Getting other user for conversation ${conversation.id}:`, {
      user1: conversation.user1,
      user2: conversation.user2,
      currentUserId: userId
    });

    // Determine which user is the "other" user
    const isUser1Current = conversation.user1_id === userId;
    const otherUser = isUser1Current ? conversation.user2 : conversation.user1;
    
    if (!otherUser) {
      console.error(`No user data found for conversation ${conversation.id}`);
      console.log("Conversation data:", conversation);
      
      // Return a fallback with the other user's ID
      const otherUserId = isUser1Current ? conversation.user2_id : conversation.user1_id;
      return {
        id: otherUserId,
        name: "Unknown User",
        profile_image: null,
        role: 'user'
      };
    }
    
    // Clean and validate the name
    const cleanName = otherUser.name?.trim();
    
    if (!cleanName) {
      console.warn(`User found but name is empty after trimming for conversation ${conversation.id}:`, otherUser);
      
      return {
        ...otherUser,
        name: "Unknown User"
      };
    }
    
    console.log(`Successfully got other user: "${cleanName}" (ID: ${otherUser.id})`);
    return {
      ...otherUser,
      name: cleanName
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
      const searchName = otherUser?.name || '';
      return searchName.toLowerCase().includes(searchQuery.toLowerCase());
    })
    : conversations;

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <h1 className="text-3xl font-bold mb-8">Messages</h1>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
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
