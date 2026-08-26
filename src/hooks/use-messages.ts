
import { useEffect } from "react";
import { useMessagesState } from "./messages/use-messages-state";
import { useMessagesOperations } from "./messages/use-messages-operations";
import { getUserById } from "@/integrations/supabase/services/chat";
import { useMessageRealtime } from "./useMessageRealtime";
import { useUserPresence } from "./useRealtime";
import { markMessagesAsRead } from "@/integrations/supabase/services/chat";
import { Message, Conversation } from "@/types/chat";

/**
 * Hook for managing conversations and messages with real-time updates
 */
export const useMessages = (userId: string, activeChatId?: string | null) => {
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

  // Sync activeChat state with activeChatId from router if provided
  useEffect(() => {
    if (activeChatId !== undefined) {
      setActiveChat(activeChatId);
    }
  }, [activeChatId, setActiveChat]);

  const {
    fetchConversations,
    fetchMessages,
    sendMessage: sendMessageOperation,
    editMessage: editMessageOperation,
    deleteMessage: deleteMessageOperation,
  } = useMessagesOperations(userId);

  // Enable user presence tracking
  useUserPresence(userId);

  // Real-time message and conversation updates
  useMessageRealtime(
    activeChat,
    userId,
    // On new message
    (newMessage: Message) => {
      // Add to messages if it's for the active conversation
      if (newMessage.conversation_id === activeChat) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }

          let resolvedMessage = newMessage;
          if (newMessage.reply_to_id && !newMessage.reply_to) {
            const original = prev.find(m => m.id === newMessage.reply_to_id);
            if (original) {
              resolvedMessage = {
                ...newMessage,
                reply_to: {
                  id: original.id,
                  sender_name: original.sender?.name?.trim() || (original.sender_id === userId ? 'You' : 'User'),
                  content: original.content,
                },
              };
            }
          }

          return [...prev, resolvedMessage];
        });

        // Automatically mark as read if the recipient is currently viewing this chat
        if (newMessage.receiver_id === userId) {
          void markMessagesAsRead(activeChat, userId);
        }
      }

      // Update conversations list to show latest message, and re-sort so the
      // conversation that just got a message jumps to the top — same as any
      // chat app.
      setConversations(prev => {
        const exists = prev.some(conv => conv.id === newMessage.conversation_id);
        if (!exists) {
          // New conversation not yet in state: silently refresh to load full participant details
          void fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError, true);
          return prev;
        }

        const updated = prev.map(conv =>
          conv.id === newMessage.conversation_id
            ? {
                ...conv,
                last_message: newMessage,
                last_message_id: newMessage.id,
                last_updated: newMessage.sent_at
              }
            : conv
        );
        return [...updated].sort(
          (a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
        );
      });
    },
    // On message update
    (updatedMessage: Message) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === updatedMessage.id
            ? {
                ...msg,
                ...updatedMessage,
                sender: msg.sender,
                reply_to: msg.reply_to,
              }
            : msg
        )
      );

      // The conversation list's unread dot reads conv.last_message.is_read,
      // not the active chat's `messages` array — patch it too
      setConversations(prev =>
        prev.map(conv =>
          conv.last_message?.id === updatedMessage.id
            ? { ...conv, last_message: { ...conv.last_message, ...updatedMessage } }
            : conv
        )
      );
    },
    // On conversation update
    (updatedConversation: Conversation) => {
      setConversations(prev => {
        const exists = prev.some(conv => conv.id === updatedConversation.id);
        if (!exists) {
          void fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError, true);
          return prev;
        }
        return prev.map(conv => 
          conv.id === updatedConversation.id 
            ? { ...conv, ...updatedConversation }
            : conv
        );
      });
    },
    // On message delete
    (deletedMessageId: string) => {
      setMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));

      setConversations(prev =>
        prev.map(conv => {
          if (conv.last_message?.id === deletedMessageId) {
            return {
              ...conv,
              last_message: undefined,
              last_message_id: "",
            };
          }
          return conv;
        })
      );
    }
  );

  // Re-sync conversations and active messages on window focus and tab visibility change
  useEffect(() => {
    if (!userId) return;

    const handleSync = () => {
      void fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError, true);
      if (activeChat) {
        void fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError, true);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };

    window.addEventListener("focus", handleSync);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, activeChat]);

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
          }
        } catch (err) {
          console.error("Error prefetching user data:", err);
        }
      };

      prefetchCurrentUser();
      fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError);
    }
  }, [userId]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError);
    }
  }, [activeChat]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      const unreadMessages = messages.filter(msg => 
        msg.receiver_id === userId && !msg.is_read
      );
      
      if (unreadMessages.length > 0) {
        markMessagesAsRead(activeChat, userId);
      }
    }
  }, [activeChat, messages, userId]);

  // Wrapper for sending messages
  const sendMessage = async (content: string, replyTo?: Message | null) => {
    await sendMessageOperation(
      activeChat,
      content,
      conversations,
      setMessages,
      setIsSending,
      setError,
      replyTo
    );
  };

  // Wrapper for editing messages
  const editMessage = async (messageId: string, content: string) => {
    return await editMessageOperation(
      messageId,
      content,
      setMessages,
      setError
    );
  };

  // Wrapper for deleting messages
  const deleteMessage = async (messageId: string) => {
    return await deleteMessageOperation(
      messageId,
      activeChat,
      setMessages,
      setConversations,
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
    editMessage,
    deleteMessage,
  };
};
