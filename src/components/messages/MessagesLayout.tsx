
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ChatContainer from "@/components/chat/ChatContainer";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/hooks/use-messages";
import { useMentorConnection } from "@/hooks/use-mentor-connection";
import { useChatConnection } from "@/hooks/use-chat-connection";
import { formatMessageTime } from "@/utils/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MessagesHeader from "./MessagesHeader";
import { supabase } from "@/integrations/supabase/client";
import { announceMessagesRead } from "@/lib/message-events";
import { useConversationUnreadCounts } from "@/hooks/useConversationUnreadCounts";

const MessagesLayout = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  // Use the real user ID from auth context instead of the sample user
  const userId = user?.id || "";

  const handleSelectChat = useCallback(
    (id: string) => {
      if (id) {
        navigate(`/messages/${id}`);
      } else {
        navigate("/messages");
      }
    },
    [navigate]
  );

  const {
    conversations,
    messages,
    activeChat,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
  } = useMessages(userId, conversationId || null);

  const { isProcessingMentor } = useMentorConnection(userId, handleSelectChat);
  const { isProcessingChat } = useChatConnection(userId, handleSelectChat);
  const getUnreadCount = useConversationUnreadCounts(userId || null);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    const markAsRead = async () => {
      if (!activeChat || !userId) return;

      // Find unread messages in active conversation
      const unreadMessages = messages.filter(
        msg => msg.conversation_id === activeChat &&
          msg.receiver_id === userId &&
          !msg.is_read
      );

      if (unreadMessages.length === 0) return;

      try {
        // Update messages as read
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true, delivery_status: 'read' })
          .eq('conversation_id', activeChat)
          .eq('receiver_id', userId)
          .eq('is_read', false);

        if (error) {
          console.error('Error marking messages as read:', error);
          return;
        }

        // Tell the navbar badge to re-count now. It also listens for the
        // realtime UPDATE, but that arrives a moment later and, on a flaky
        // connection, sometimes not at all — which is what left a "1" sitting
        // over the message icon after the conversation had plainly been read.
        announceMessagesRead();
      } catch (error) {
        console.error('Error in markAsRead:', error);
      }
    };

    // Mark as read after a short delay (user has actually viewed the messages)
    const timer = setTimeout(markAsRead, 1000);
    return () => clearTimeout(timer);
  }, [activeChat, userId, messages]);

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error.message || 'Failed to load conversations'}`);
      console.error("Error in Messages component:", error);
    }
  }, [error]);

  const getOtherUser = (conversation) => {
    const otherUser = conversation.user1_id === userId ? conversation.user2 : conversation.user1;

    if (!otherUser) {
      return {
        id: conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id,
        name: "Student",
        profile_image: null,
        role: 'student'
      };
    }

    // "Unknown User" used to appear here whenever RLS hid the other person's
    // row, which described our failure to read a name rather than anything
    // about them. The service now resolves it; this is only a last resort.
    const finalName = otherUser.name?.trim() || "Student";

    return {
      ...otherUser,
      name: finalName
    };
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
      <MessagesHeader isProcessingMentor={isProcessingMentor || isProcessingChat} />

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
        setActiveChat={handleSelectChat}
        getUnreadCount={getUnreadCount}
        handleSendMessage={sendMessage}
        handleEditMessage={editMessage}
        handleDeleteMessage={deleteMessage}
      />
    </>
  );
};

export default MessagesLayout;
