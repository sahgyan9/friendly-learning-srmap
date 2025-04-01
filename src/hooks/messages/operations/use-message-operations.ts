
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
      console.log(`Fetching messages for conversation ${conversationId} for user ${userId}`);
      
      if (!userId) {
        throw new Error("User ID is required to fetch messages");
      }
      
      // Check if this is a demo conversation
      if (conversationId.startsWith('demo-')) {
        console.log("Using demo messages from localStorage");
        const demoMessages = getDemoMessages(conversationId);
        setMessages(demoMessages);
        setIsLoadingMessages(false);
        return;
      }

      const { data, error } = await getConversationMessages(conversationId);
      
      if (error) {
        console.error("Error fetching messages:", error);
        setError(error);
        
        // Check for auth errors and fall back to demo mode
        if (error.message?.includes("auth") || error.message?.includes("not authorized")) {
          console.log("Authorization error - using demo messages from localStorage");
          const demoMessages = getDemoMessages(conversationId);
          if (demoMessages.length > 0) {
            setMessages(demoMessages);
          }
        }
        
        return;
      }
      
      if (data) {
        console.log("Fetched messages:", data);
        setMessages(data);
        
        // Mark messages as read
        await markMessagesAsRead(conversationId, userId);
      } else {
        console.log("No messages found for this conversation");
        setMessages([]);
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
