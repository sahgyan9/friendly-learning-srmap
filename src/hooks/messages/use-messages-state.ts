import { useState } from "react";
import { Conversation, Message } from "@/types/chat";

/**
 * Hook for managing message-related state
 */
export const useMessagesState = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return {
    messages,
    setMessages,
    conversations,
    setConversations,
    activeChat,
    setActiveChat,
    isLoadingMessages,
    setIsLoadingMessages,
    isLoadingConversations,
    setIsLoadingConversations,
    isSending,
    setIsSending,
    error,
    setError,
  };
};
