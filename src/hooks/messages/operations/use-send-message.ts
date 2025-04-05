import { useCallback } from "react";
import { Message } from "@/types/chat";
import { sendMessage } from "@/integrations/supabase/services/chat";
import { toast } from "sonner";

/**
 * Hook for sending messages
 */
export const useSendMessage = () => {
  const sendMessageOperation = useCallback(async (
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<Message | null> => {
    try {
      const { data, error } = await sendMessage(
        conversationId,
        senderId,
        receiverId,
        content
      );

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return null;
      }

      if (!data) {
        console.error("No data returned from send message operation");
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An error occurred while sending your message");
      return null;
    }
  }, []);

  return {
    sendMessage: sendMessageOperation,
  };
};
