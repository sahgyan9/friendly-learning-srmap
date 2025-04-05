import { useCallback } from "react";
import { Conversation } from "@/types/chat";
import { getUserConversations } from "@/integrations/supabase/services/chat";
import { toast } from "sonner";

/**
 * Hook for conversation operations
 */
export const useConversationOperations = () => {
  const fetchUserConversations = useCallback(async (userId: string): Promise<Conversation[]> => {
    try {
      const { data, error } = await getUserConversations(userId);

      if (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
        return [];
      }

      if (!data) {
        console.log("No conversations found for user:", userId);
        return [];
      }

      return data;
    } catch (err) {
      console.error("Exception fetching conversations:", err);
      toast.error("An error occurred while loading conversations");
      return [];
    }
  }, []);

  return {
    fetchUserConversations,
  };
};
