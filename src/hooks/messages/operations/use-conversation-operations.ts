
import { toast } from "sonner";
import { Conversation } from "@/types/chat";
import { useDemoMessages } from "../use-demo-messages";
import { getUserConversations } from "@/integrations/supabase/services/chat";

/**
 * Hook for conversation operations
 */
export const useConversationOperations = (userId: string) => {
  const { getDemoConversations } = useDemoMessages();

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
    
    try {
      console.log("Fetching conversations for user:", userId);
      const { data, error } = await getUserConversations(userId);
      
      if (error) {
        console.error("Error fetching conversations:", error);
        setError(error);
        
        // Check for demo data in localStorage as a fallback
        const demoConversations = getDemoConversations();
        
        // Filter conversations related to this user
        const filteredConversations = demoConversations.filter(
          c => c.user1_id === userId || c.user2_id === userId
        );
        
        if (filteredConversations.length > 0) {
          setConversations(filteredConversations);
          setActiveChat(filteredConversations[0].id);
        }
        
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
      }
    } catch (err) {
      console.error("Exception fetching conversations:", err);
      setError(err as Error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  return {
    fetchConversations
  };
};
