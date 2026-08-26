
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
    setError: React.Dispatch<React.SetStateAction<Error | null>>,
    replyTo?: Message | null
  ) => {
    if (!conversationId || !content.trim() || !userId) {
      console.error("Invalid sendMessage parameters", {
        conversationId,
        content: content.length > 0,
        userId
      });
      toast.error("Unable to send message: Missing required information");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.error("Conversation not found:", conversationId);
        toast.error("Error: Conversation not found");
        setIsSending(false);
        return;
      }

      const receiverId =
        conversation.user1_id === userId
          ? conversation.user2_id
          : conversation.user1_id;

      const replyToPayload = replyTo
        ? {
            id: replyTo.id,
            sender_name: replyTo.sender?.name?.trim() || (replyTo.sender_id === userId ? 'You' : 'User'),
            content: replyTo.content,
          }
        : null;

      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: userId,
        receiver_id: receiverId,
        content: content,
        sent_at: new Date().toISOString(),
        is_read: false,
        delivery_status: 'sent',
        reply_to_id: replyTo?.id || null,
        reply_to: replyToPayload,
      };

      setMessages(prev => [...prev, tempMessage]);

      const { data, error } = await sendMessageApi(
        conversationId,
        userId,
        receiverId,
        content,
        replyTo?.id || null
      );

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message. Please try again.");

        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setError(error);
        return;
      }

      if (data) {
        const enriched = {
          ...data,
          reply_to: replyToPayload,
        };
        setMessages(prev =>
          prev.map(msg => (msg.id === tempMessage.id ? enriched : msg))
        );
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast.error(`Failed to send message: ${errorMessage}`);
      setError(err as Error);
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendMessage
  };
};
