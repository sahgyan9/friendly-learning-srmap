import { Message } from "@/types/chat";
import { getConversationMessages, markMessagesAsRead } from "@/integrations/supabase/services/chat";

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
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    setIsLoadingMessages(true);
    setError(null);
    setMessages([]);

    try {
      console.log("Fetching messages for conversation:", conversationId);

      const { data, error } = await getConversationMessages(conversationId);

      if (error) {
        console.error("Error fetching messages:", error);
        setError(error);
        return;
      }

      if (data) {
        console.log(`Fetched ${data.length} messages`);
        setMessages(data);

        // Mark messages as read
        await markMessagesAsRead(conversationId, userId);
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
