
import { Conversation, Message } from "@/types/chat";
import { useDemoMessages } from "../use-demo-messages";
import { sendMessage as sendMessageAPI } from "@/integrations/supabase/services/chat";

/**
 * Hook for sending messages
 */
export const useSendMessage = (userId: string) => {
  const { saveDemoMessage } = useDemoMessages();

  /**
   * Send a message in a conversation
   */
  const sendMessage = async (
    activeChat: string | null,
    content: string,
    conversations: Conversation[],
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
    setIsSending: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<Error | null>>
  ) => {
    if (!activeChat) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      const currentConversation = conversations.find(c => c.id === activeChat);
      if (!currentConversation) return;
      
      const receiverId = currentConversation.user1_id === userId 
        ? currentConversation.user2_id 
        : currentConversation.user1_id;
      
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: activeChat,
        sender_id: userId,
        receiver_id: receiverId,
        content: content,
        sent_at: new Date().toISOString(),
        is_read: false
      };
      
      // Add the message to the local state for immediate UI feedback
      setMessages(prev => [...prev, tempMessage]);
      
      const { data, error } = await sendMessageAPI(
        activeChat,
        userId,
        receiverId,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        
        // Fall back to localStorage for demo
        if (error.message && (error.message.includes("row-level security") || error.message.includes("invalid input syntax for type uuid"))) {
          console.log("Using localStorage for demo messaging");
          
          // Save to localStorage and get updated conversation
          const updatedConversation = saveDemoMessage(activeChat, tempMessage, userId, receiverId);
          
          if (updatedConversation) {
            // Update the conversations state with the new last message
            setConversations(prev => 
              prev.map(conv => 
                conv.id === activeChat ? updatedConversation : conv
              )
            );
          }
        } else {
          setError(error);
          return;
        }
      } else if (data) {
        setMessages(prev => 
          prev.map(m => m.id === tempMessage.id ? data : m)
        );
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === activeChat 
              ? { 
                  ...conv, 
                  last_message: data,
                  last_message_id: data.id,
                  last_updated: new Date().toISOString() 
                }
              : conv
          )
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
