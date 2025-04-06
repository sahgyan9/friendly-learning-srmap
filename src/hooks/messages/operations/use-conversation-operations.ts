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
      console.log("No user ID provided, skipping conversation fetch");
      setIsLoadingConversations(false);
      return;
    }

    try {
      console.log("Fetching conversations for user:", userId);

      const { data, error } = await getUserConversations(userId);

      if (error) {
        console.error("Error fetching conversations:", error);
        setError(error);
        toast.error("Failed to load conversations. Please try again later.");
        return;
      }

      if (data) {
        console.log("Fetched conversations:", data);
        setConversations(data);
        if (data.length > 0) {
          setActiveChat(data[0].id);
        }
      } else {
        console.log("No conversations data returned");
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
