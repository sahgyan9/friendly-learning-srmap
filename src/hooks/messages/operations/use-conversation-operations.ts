import { toast } from "sonner";
import { Conversation } from "@/types/chat";
import { getUserConversations } from "@/integrations/supabase/services/chat";

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
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    setIsLoadingConversations(true);
    setError(null);

    // Return early if no userId is provided
    if (!userId) {
      setIsLoadingConversations(false);
      return;
    }

    try {

      const { data, error } = await getUserConversations(userId);

      if (error) {
        console.error("Error fetching conversations:", error);
        setError(error);
        toast.error("Failed to load conversations. Please try again later.");
        return;
      }

      if (data) {
        setConversations(data);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error("Exception fetching conversations:", err);
      setError(err as Error);
      toast.error("An error occurred while loading conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  return {
    fetchConversations
  };
};
