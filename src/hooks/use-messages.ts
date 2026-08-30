import { useEffect, useCallback, useMemo, useState } from "react";
import { useMessagesState } from "./messages/use-messages-state";
import { useMessagesOperations } from "./messages/use-messages-operations";
import { toggleDirectMessageReaction, markMessagesAsRead, getConversationById } from "@/integrations/supabase/services/chat";
import { MESSAGES_SENT_EVENT } from "@/lib/message-events";
import { useMessageRealtime } from "./useMessageRealtime";
import { useUserPresence } from "./useRealtime";
import { Message, Conversation } from "@/types/chat";
import { setOfflineCache } from "@/lib/offline/offlineStorage";
import { outboxMessageToChatMessage } from "@/lib/offline/messageOutbox";
import { useOutboxForConversation } from "./useMessageOutbox";

/**
 * Hook for managing conversations and messages with real-time updates and offline caching
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

      // Update conversations list to show latest message, and re-sort
      setConversations(prev => {
        const exists = prev.some(conv => conv.id === newMessage.conversation_id);
        if (!exists) {
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
                // The raw messages-table row carried by this event has no
                // reactions/viewer_reactions columns (those are computed by
                // get_conversation_messages), so spreading it over msg would
                // otherwise blank out any reaction badges already shown.
                reactions: msg.reactions,
                viewer_reactions: msg.viewer_reactions,
              }
            : msg
        )
      );

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
    },
    // On reaction change in database
    useCallback((payload?: any) => {
      if (payload?.eventType && (payload.new || payload.old)) {
        const data = payload.new || payload.old;
        const { message_id, user_id, emoji } = data || {};
        if (message_id && emoji) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== message_id) return msg;
              const currentReactions = { ...(msg.reactions || {}) };
              const currentViewerReactions = [...(msg.viewer_reactions || [])];
              const isViewer = user_id === userId;

              if (payload.eventType === 'INSERT') {
                currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
                if (isViewer && !currentViewerReactions.includes(emoji)) {
                  currentViewerReactions.push(emoji);
                }
              } else if (payload.eventType === 'DELETE') {
                const nextCount = (currentReactions[emoji] || 1) - 1;
                if (nextCount <= 0) {
                  delete currentReactions[emoji];
                } else {
                  currentReactions[emoji] = nextCount;
                }
                if (isViewer) {
                  const idx = currentViewerReactions.indexOf(emoji);
                  if (idx !== -1) currentViewerReactions.splice(idx, 1);
                }
              }

              return {
                ...msg,
                reactions: currentReactions,
                viewer_reactions: currentViewerReactions,
              };
            })
          );
        }
      }

      if (activeChat) {
        void fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError, true);
      }
    }, [activeChat, userId, fetchMessages, setMessages, setIsLoadingMessages, setError])
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
    // A dropped and restored connection doesn't always change tab focus or
    // visibility (e.g. wifi blips while the tab stays in front), so it needs
    // its own listener rather than relying on those two alone.
    window.addEventListener("online", handleSync);

    return () => {
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", handleSync);
    };
  }, [userId, activeChat, fetchConversations, fetchMessages, setActiveChat, setError, setIsLoadingConversations, setIsLoadingMessages, setConversations, setMessages]);

  // Fetch conversations on initial load
  useEffect(() => {
    if (userId) {
      fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError);
    }
  }, [userId]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError);
    }
  }, [activeChat]);

  // Ensure active conversation details are loaded into state if not already present
  useEffect(() => {
    if (!activeChat || !userId) return;

    const exists = conversations.some((c) => c.id === activeChat);
    if (!exists) {
      void getConversationById(activeChat).then((conv) => {
        if (conv) {
          setConversations((prev) => {
            if (prev.some((c) => c.id === conv.id)) return prev;
            return [conv, ...prev];
          });
        } else {
          // If not found yet, refetch conversations list silently
          void fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError, true);
        }
      });
    }
  }, [activeChat, userId, conversations]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      const unreadMessages = messages.filter(
        (msg) => msg.receiver_id === userId && !msg.is_read
      );
      if (unreadMessages.length > 0) {
        markMessagesAsRead(activeChat, userId);
      }
    }
  }, [activeChat, messages, userId]);

  // Persist messages of the active chat to offline cache
  useEffect(() => {
    if (activeChat && messages.length > 0) {
      setOfflineCache(`chat_messages:${activeChat}`, messages);
    }
  }, [activeChat, messages]);

  // Persist conversation list to offline cache
  useEffect(() => {
    if (userId && conversations.length > 0) {
      setOfflineCache(`chat_conversations:${userId}`, conversations);
    }
  }, [userId, conversations]);

  // Messages written offline and still waiting to go out.
  //
  // Kept beside `messages` rather than mixed into it: that state is replaced
  // wholesale every time the conversation is fetched, which would drop a
  // queued message from view each refresh even though it is safely stored.
  const outboxMessages = useOutboxForConversation(activeChat);

  // A queued message that has just gone out leaves behind a real one this
  // client has not read yet. Re-read both silently, so the clock turns into a
  // tick without the thread flickering through a loading state.
  useEffect(() => {
    const onSent = () => {
      if (activeChat) {
        void fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError, true);
      }
      if (userId) {
        void fetchConversations(setConversations, setActiveChat, setIsLoadingConversations, setError, true);
      }
    };

    window.addEventListener(MESSAGES_SENT_EVENT, onSent);
    return () => window.removeEventListener(MESSAGES_SENT_EVENT, onSent);
  }, [
    activeChat,
    userId,
    fetchMessages,
    fetchConversations,
    setMessages,
    setConversations,
    setActiveChat,
    setIsLoadingMessages,
    setIsLoadingConversations,
    setError,
  ]);

  // Queued messages sit after everything the server has, which is where they
  // were written. They carry a 'queued' status, so the thread shows a clock
  // against them rather than a tick that would claim they had arrived.
  const messagesWithQueued = useMemo(() => {
    if (outboxMessages.length === 0) return messages;
    return [...messages, ...outboxMessages.map(outboxMessageToChatMessage)];
  }, [messages, outboxMessages]);

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

  // Wrapper for toggling reactions on a message
  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!userId || !activeChat) return;

    // Optimistically update reactions
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = { ...(msg.reactions || {}) };
        const currentViewerReactions = [...(msg.viewer_reactions || [])];
        const hasReacted = currentViewerReactions.includes(emoji);

        if (hasReacted) {
          const nextCount = (currentReactions[emoji] || 1) - 1;
          if (nextCount <= 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = nextCount;
          }
          return {
            ...msg,
            reactions: currentReactions,
            viewer_reactions: currentViewerReactions.filter((e) => e !== emoji),
          };
        } else {
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
          return {
            ...msg,
            reactions: currentReactions,
            viewer_reactions: [...currentViewerReactions, emoji],
          };
        }
      })
    );

    const { error: reactionError } = await toggleDirectMessageReaction(messageId, emoji);
    if (reactionError) {
      console.error("Error toggling message reaction:", reactionError);
      if (activeChat) {
        void fetchMessages(activeChat, setMessages, setIsLoadingMessages, setError, true);
      }
    }
  };

  return {
    conversations,
    messages: messagesWithQueued,
    activeChat,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    setActiveChat,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
  };
};
