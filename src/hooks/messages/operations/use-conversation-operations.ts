
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
      
      if (!userId) {
        throw new Error("User ID is required to fetch conversations");
      }
      
      const { data, error } = await getUserConversations(userId);
      
      if (error) {
        console.error("Error fetching conversations:", error);
        
        // For auth errors or other issues, fall back to demo data
        if (error.message?.includes("auth") || error.message?.includes("not authorized")) {
          console.log("Authorization error - using demo conversations from localStorage");
          const demoConversations = getDemoConversations();
          
          // Filter conversations related to this user
          const filteredConversations = demoConversations.filter(
            c => c.user1_id === userId || c.user2_id === userId
          );
          
          if (filteredConversations.length > 0) {
            setConversations(filteredConversations);
            setActiveChat(filteredConversations[0].id);
          }
        } else {
          setError(error);
        }
        
        return;
      }
      
      if (data && data.length > 0) {
        console.log("Fetched conversations:", data);
        setConversations(data);
        setActiveChat(data[0].id);
      } else {
        console.log("No conversations found for user:", userId);
        setConversations([]);
        setActiveChat(null);
      }
    } catch (err) {
      console.error("Exception fetching conversations:", err);
      setError(err as Error);
      toast.error("Failed to load your conversations");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  return {
    fetchConversations
  };
};
