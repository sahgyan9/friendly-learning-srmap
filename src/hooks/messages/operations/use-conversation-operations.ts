import { toast } from "sonner";
import { Conversation } from "@/types/chat";
import { getUserConversations } from "@/integrations/supabase/services/chat";
import { getOfflineCache, setOfflineCache } from "@/lib/offline/offlineStorage";

/**
 * Hook for conversation operations
 */
export const useConversationOperations = (userId: string) => {
  /**
   * Fetch user conversations
   */
  const fetchConversations = async (
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
    setActiveChat: React.Dispatch<React.SetStateAction<string | null>>,
    setIsLoadingConversations: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>,
    silent = false
  ) => {
    // Return early if no userId is provided
    if (!userId) {
      if (!silent) {
        setIsLoadingConversations(false);
      }
      return;
    }

    // Load from offline cache immediately
    const cached = getOfflineCache<Conversation[]>(`chat_conversations:${userId}`);
    if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
      setConversations(cached.data);
      if (!silent) {
        setIsLoadingConversations(false);
      }
    } else if (!silent) {
      setIsLoadingConversations(true);
    }
    setError(null);

    // If completely offline, we're done
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!silent) {
        setIsLoadingConversations(false);
      }
      return;
    }

    try {
      const { data, error } = await getUserConversations(userId);

      if (error) {
        console.error("Error fetching conversations:", error);
        setError(error);
        if (!silent && !cached?.data) {
          toast.error("Failed to load conversations. Please try again later.");
        }
        return;
      }

      if (data) {
        setConversations(data);
        setOfflineCache(`chat_conversations:${userId}`, data);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Exception fetching conversations:", err);
      setError(err as Error);
      if (!silent && !cached?.data) {
        toast.error("An error occurred while loading conversations");
      }
    } finally {
      if (!silent) {
        setIsLoadingConversations(false);
      }
    }
  };

  return {
    fetchConversations
  };
};
