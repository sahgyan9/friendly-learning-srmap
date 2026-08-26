import { toast } from "sonner";
import { Conversation, Message } from "@/types/chat";
import { deleteDirectMessage as deleteDirectMessageApi } from "@/integrations/supabase/services/chat";

/**
 * Hook for deleting direct messages within 30 minutes
 */
export const useDeleteMessage = (userId: string) => {
  const deleteMessage = async (
    messageId: string,
    activeChat: string | null,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    if (!messageId || !userId) {
      return { success: false };
    }

    let deletedMessage: Message | undefined;
    let originalMessages: Message[] = [];

    // Optimistically remove message from state
    setMessages((prev) => {
      originalMessages = prev;
      deletedMessage = prev.find((m) => m.id === messageId);
      return prev.filter((msg) => msg.id !== messageId);
    });

    try {
      const { data: success, error } = await deleteDirectMessageApi(messageId);

      if (error || !success) {
        console.error("Error deleting message:", error);
        toast.error(error?.message || "Failed to delete message. (Only deletable within 30m)");

        // Revert optimistic delete
        setMessages(originalMessages);
        if (error) setError(error);
        return { success: false, error };
      }

      // Update conversation list preview if the deleted message was the last_message
      if (activeChat && deletedMessage) {
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv.id === activeChat && conv.last_message?.id === messageId) {
              const remaining = originalMessages.filter((m) => m.id !== messageId);
              const newLast = remaining[remaining.length - 1] || undefined;
              return {
                ...conv,
                last_message: newLast,
                last_message_id: newLast?.id || "",
                last_updated: newLast?.sent_at || conv.last_updated,
              };
            }
            return conv;
          })
        );
      }

      toast.success("Message deleted");
      return { success: true };
    } catch (err) {
      console.error("Exception deleting message:", err);
      setMessages(originalMessages);
      const errorObj = err instanceof Error ? err : new Error("Failed to delete message");
      toast.error(errorObj.message);
      setError(errorObj);
      return { success: false, error: errorObj };
    }
  };

  return { deleteMessage };
};
