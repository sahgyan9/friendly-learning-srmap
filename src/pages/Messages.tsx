
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/use-messages";
import { formatMessageTime } from "@/utils/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";

const Messages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isProcessingMentor, setIsProcessingMentor] = useState(false);

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

  // Handle mentor parameter from URL
  useEffect(() => {
    const mentorId = searchParams.get('mentor');
    
    if (mentorId && user?.id && !isProcessingMentor) {
      const handleMentorConnection = async () => {
        setIsProcessingMentor(true);
        
        try {
          console.log('Processing mentor connection for mentor ID:', mentorId);
          
          // First verify the mentor exists
          const { data: mentor, error: mentorError } = await getMentorById(mentorId);
          
          if (mentorError || !mentor) {
            console.error('Mentor not found:', mentorError);
            toast.error("Mentor not found or is no longer available");
            return;
          }
          
          // Check if user is trying to message themselves
          if (mentor.id === user.id) {
            toast.error("You cannot message yourself");
            return;
          }
          
          console.log('Found mentor:', mentor.name);
          
          // Get or create conversation with the mentor
          const { data: conversation, error: conversationError } = await getOrCreateConversation(user.id, mentorId);
          
          if (conversationError || !conversation) {
            console.error('Failed to create/get conversation:', conversationError);
            toast.error("Failed to start conversation with mentor");
            return;
          }
          
          console.log('Conversation ready:', conversation.id);
          
          // Set the active chat to this conversation
          setActiveChat(conversation.id);
          
          toast.success(`Connected with ${mentor.name}. You can now start messaging!`);
          
        } catch (err) {
          console.error('Exception during mentor connection:', err);
          toast.error("An unexpected error occurred while connecting to the mentor");
        } finally {
          setIsProcessingMentor(false);
        }
      };
      
      handleMentorConnection();
    }
  }, [searchParams, user?.id, setActiveChat, isProcessingMentor]);

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
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Messages</h1>
            {isProcessingMentor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting with mentor...
              </div>
            )}
          </div>

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
