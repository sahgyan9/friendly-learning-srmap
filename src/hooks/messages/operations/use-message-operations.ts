import { Message } from "@/types/chat";
import { getConversationMessages, markMessagesAsRead } from "@/integrations/supabase/services/chat";
import { getOfflineCache, setOfflineCache } from "@/lib/offline/offlineStorage";

/**
 * Hook for message operations
 */
export const useMessageOperations = (userId: string) => {
  /**
   * Fetch messages for a conversation
   */
  const fetchMessages = async (
    conversationId: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setIsLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>,
    silent = false
  ) => {
    // Load from offline cache immediately so messages appear with 0ms delay
    const cached = getOfflineCache<Message[]>(`chat_messages:${conversationId}`);
    if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
      setMessages(cached.data);
      if (!silent) {
        setIsLoadingMessages(false);
      }
    } else if (!silent) {
      setIsLoadingMessages(true);
    }
    setError(null);

    // If offline, we are done
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!silent) {
        setIsLoadingMessages(false);
      }
      return;
    }

    try {
      const { data, error } = await getConversationMessages(conversationId);

      if (error) {
        console.error("Error fetching messages:", error);
        setError(error);
        return;
      }

      if (data) {
        setMessages(data);
        setOfflineCache(`chat_messages:${conversationId}`, data);

        // Mark messages as read in background without blocking UI
        if (userId) {
          void markMessagesAsRead(conversationId, userId);
        }
      }
    } catch (err) {
      console.error("Exception fetching messages:", err);
      setError(err as Error);
    } finally {
      if (!silent) {
        setIsLoadingMessages(false);
      }
    }
  };

  return {
    fetchMessages
  };
};
