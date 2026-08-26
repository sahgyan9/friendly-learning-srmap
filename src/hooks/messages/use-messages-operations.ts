import { Conversation, Message } from "@/types/chat";
import { useConversationOperations } from "./operations/use-conversation-operations";
import { useMessageOperations } from "./operations/use-message-operations";
import { useSendMessage } from "./operations/use-send-message";
import { useEditMessage } from "./operations/use-edit-message";
import { useDeleteMessage } from "./operations/use-delete-message";

/**
 * Hook for message operations like fetching, sending, editing, and deleting
 */
export const useMessagesOperations = (userId: string) => {
  const { fetchConversations } = useConversationOperations(userId);
  const { fetchMessages } = useMessageOperations(userId);
  const { sendMessage } = useSendMessage(userId);
  const { editMessage } = useEditMessage(userId);
  const { deleteMessage } = useDeleteMessage(userId);

  return {
    fetchConversations,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
  };
};

