import { Conversation, Message } from "@/types/chat";
import { useConversationOperations } from "./operations/use-conversation-operations";
import { useMessageOperations } from "./operations/use-message-operations";
import { useSendMessage } from "./operations/use-send-message";

/**
 * Hook for message operations like fetching and sending
 */
export const useMessagesOperations = (userId: string) => {
  const { fetchConversations } = useConversationOperations(userId);
  const { fetchMessages } = useMessageOperations(userId);
  const { sendMessage } = useSendMessage(userId);

  return {
    fetchConversations,
    fetchMessages,
    sendMessage
  };
};
