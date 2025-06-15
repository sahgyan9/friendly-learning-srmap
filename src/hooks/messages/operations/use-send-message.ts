
import { toast } from "sonner";
import { Conversation, Message } from "@/types/chat";
import { sendMessage as sendMessageApi } from "@/integrations/supabase/services/chat";

/**
 * Hook for sending messages
 */
export const useSendMessage = (userId: string) => {
  /**
   * Send a message
   */
  const sendMessage = async (
    conversationId: string,
    content: string,
    conversations: Conversation[],
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setIsSending: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    if (!conversationId || !content.trim() || !userId) {
      console.error("Invalid sendMessage parameters", {
        conversationId,
        content: content.length > 0,
        userId
      });
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.error("Conversation not found:", conversationId);
        toast.error("Error: Conversation not found");
        return;
      }

      const receiverId =
        conversation.user1_id === userId
          ? conversation.user2_id
          : conversation.user1_id;

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: userId,
        receiver_id: receiverId,
        content: content,
        sent_at: new Date().toISOString(),
        is_read: false
      };

      setMessages(prev => [...prev, tempMessage]);

      const { data, error } = await sendMessageApi(
        conversationId,
        userId,
        receiverId,
        content
      );

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");

        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        return;
      }

      if (data) {
        setMessages(prev =>
          prev.map(msg => (msg.id === tempMessage.id ? data : msg))
        );
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      setError(err as Error);
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendMessage
  };
};
