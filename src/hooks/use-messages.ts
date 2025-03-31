
import { useEffect } from "react";
import { useMessagesState } from "./messages/use-messages-state";
import { useMessagesOperations } from "./messages/use-messages-operations";

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
    fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError);
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
