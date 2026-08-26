import { toast } from "sonner";
import { Message } from "@/types/chat";
import { editDirectMessage as editDirectMessageApi } from "@/integrations/supabase/services/chat";

/**
 * Hook for editing direct messages within 30 minutes
 */
export const useEditMessage = (userId: string) => {
  const editMessage = async (
    messageId: string,
    content: string,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    const trimmed = content.trim();
    if (!messageId || !trimmed || !userId) {
      toast.error("Message cannot be empty");
      return { success: false };
    }

    let previousMessage: Message | undefined;

    // Optimistically update message in state
    setMessages((prev) => {
      previousMessage = prev.find((m) => m.id === messageId);
      return prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: trimmed,
              is_edited: true,
              edited_at: new Date().toISOString(),
            }
          : msg
      );
    });

    try {
      const { data, error } = await editDirectMessageApi(messageId, trimmed);

      if (error) {
        console.error("Error editing message:", error);
        toast.error(error.message || "Failed to edit message. (Only editable within 30m)");

        // Revert optimistic update
        if (previousMessage) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === messageId ? previousMessage! : msg))
          );
        }
        setError(error);
        return { success: false, error };
      }

      toast.success("Message edited");
      return { success: true, data };
    } catch (err) {
      console.error("Exception editing message:", err);
      if (previousMessage) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? previousMessage! : msg))
        );
      }
      const errorObj = err instanceof Error ? err : new Error("Failed to edit message");
      toast.error(errorObj.message);
      setError(errorObj);
      return { success: false, error: errorObj };
    }
  };

  return { editMessage };
};
