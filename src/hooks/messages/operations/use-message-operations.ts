
import { Message } from "@/types/chat";
import { useDemoMessages } from "../use-demo-messages";
import { getConversationMessages, markMessagesAsRead } from "@/integrations/supabase/services/chat";

/**
 * Hook for message operations like fetching messages
 */
export const useMessageOperations = (userId: string) => {
  const { getDemoMessages } = useDemoMessages();

  /**
   * Fetch messages for a conversation
   */
  const fetchMessages = async (
    conversationId: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setIsLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    setIsLoadingMessages(true);
    setError(null);
    
    try {
      // Handle demo conversation IDs differently
      if (conversationId.startsWith('demo-')) {
        const demoMessages = getDemoMessages(conversationId);
        if (demoMessages.length > 0) {
          console.log("Using demo messages from localStorage:", demoMessages);
          setMessages(demoMessages);
        }
        setIsLoadingMessages(false);
        return;
      }
      
      const { data, error } = await getConversationMessages(conversationId);
      
      if (error) {
        console.error("Error fetching messages:", error);
        setError(error);
        
        // Check for demo messages in localStorage as a fallback
        const demoMessages = getDemoMessages(conversationId);
        if (demoMessages.length > 0) {
          console.log("Using demo messages from localStorage:", demoMessages);
          setMessages(demoMessages);
        }
        
        return;
      }
      
      if (data) {
        console.log("Fetched messages:", data);
        setMessages(data);
        
        // Mark messages as read if the user ID is valid
        if (userId && !userId.startsWith('demo-')) {
          await markMessagesAsRead(conversationId, userId);
        }
      }
    } catch (err) {
      console.error("Exception fetching messages:", err);
      setError(err as Error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  return {
    fetchMessages
  };
};
