
import { useEffect } from "react";
import { useMessagesState } from "./messages/use-messages-state";
import { useMessagesOperations } from "./messages/use-messages-operations";
import { getUserById } from "@/integrations/supabase/services/chat";

/**
 * Hook for managing conversations and messages
 */
export const useMessages = (userId: string) => {
  const {
    conversations,
    messages,
    activeChat,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    setConversations,
    setMessages,
    setActiveChat,
    setIsLoadingConversations,
    setIsLoadingMessages,
    setIsSending,
    setError
  } = useMessagesState();

  const {
    fetchConversations,
    fetchMessages,
    sendMessage: sendMessageOperation
  } = useMessagesOperations(userId);

  // Fetch conversations on initial load
  useEffect(() => {
    if (userId) {
      // Prefetch user data for the current user
      const prefetchCurrentUser = async () => {
        try {
          const { data, error } = await getUserById(userId);
          if (error) {
            console.error("Error fetching current user data:", error);
          } else if (data) {
            console.log("Current user data prefetched:", data);
          }
        } catch (err) {
          console.error("Error prefetching user data:", err);
        }
      };

      // First ensure current user data is in the database
      prefetchCurrentUser();
      
      // Then fetch conversations
      fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError);
    }
  }, [userId]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError);
    }
  }, [activeChat]);

  // Wrapper for sending messages
  const sendMessage = async (content: string) => {
    await sendMessageOperation(
      activeChat,
      content,
      conversations,
      setMessages,
      setConversations,
      setIsSending,
      setError
    );
  };

  return {
    conversations,
    messages,
    activeChat,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    setActiveChat,
    sendMessage,
  };
};
