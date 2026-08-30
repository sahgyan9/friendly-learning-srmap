
import { toast } from "sonner";
import { Conversation, Message } from "@/types/chat";
import { sendMessage as sendMessageApi } from "@/integrations/supabase/services/chat";
import { enqueueMessage } from "@/lib/offline/messageOutbox";

/**
 * Is this a failure the connection is to blame for, rather than a refusal?
 *
 * The distinction decides whether the message is worth holding on to. A
 * dropped request will succeed later untouched; a message the database
 * refused — a blocked user, a conversation they are not part of — will be
 * refused every time, and queueing it would promise a delivery that is never
 * coming. supabase-js surfaces a rejection with a `code`; a fetch that never
 * reached the server has none.
 */
function isConnectivityFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: string }).code) return false;

  const message = "message" in error ? String((error as { message?: string }).message) : "";
  return /failed to fetch|networkerror|network request failed|load failed|timeout/i.test(message);
}

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

    const replyToPayload = replyTo
      ? {
          id: replyTo.id,
          sender_name: replyTo.sender?.name?.trim() || (replyTo.sender_id === userId ? 'You' : 'User'),
          content: replyTo.content,
        }
      : null;

    // Resolved before the send is attempted rather than inside it, so the
    // failure paths below can queue the message without working out who it
    // was for all over again.
    const queueForLater = () => {
      enqueueMessage({
        conversationId,
        senderId: userId,
        receiverId,
        content,
        replyToId: replyTo?.id || null,
        replyTo: replyToPayload,
      });
      toast.info("Saved. It will send when you are back online.");
    };

    // Nothing to try. Queue it and let the thread render it from the outbox
    // rather than firing a request that cannot go anywhere, so the text is
    // never lost and never looks delivered.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueForLater();
      return;
    }

    setIsSending(true);
    setError(null);

    try {
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
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));

        if (isConnectivityFailure(error)) {
          queueForLater();
          return;
        }

        toast.error("Failed to send message. Please try again.");
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

      if (isConnectivityFailure(err)) {
        // The optimistic copy goes too: the outbox owns this message now, and
        // the conversation renders it from there.
        setMessages(prev => prev.filter(msg => !msg.id.startsWith("temp-")));
        queueForLater();
        return;
      }

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
