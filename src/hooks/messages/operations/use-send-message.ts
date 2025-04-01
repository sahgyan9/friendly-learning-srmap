
import { Conversation, Message } from "@/types/chat";
import { useDemoMessages } from "../use-demo-messages";
import { sendMessage as sendMessageAPI } from "@/integrations/supabase/services/chat";
import { toast } from "sonner";

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
    if (!activeChat) {
      toast.error("No active chat selected");
      return;
    }
    
    if (!userId) {
      toast.error("You must be signed in to send messages");
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    try {
      const currentConversation = conversations.find(c => c.id === activeChat);
      if (!currentConversation) {
        throw new Error("Conversation not found");
      }
      
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
      
      // Check if this is a demo conversation
      if (activeChat.startsWith('demo-')) {
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
        
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsSending(false);
        return;
      }
      
      // Send the message to the real backend
      const { data, error } = await sendMessageAPI(
        activeChat,
        userId,
        receiverId,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        
        // Fall back to localStorage for auth errors or demo mode
        if (error.message?.includes("auth") || error.message?.includes("not authorized")) {
          console.log("Using localStorage for demo messaging due to auth error");
          
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
          // Remove the temp message if it's not an auth error
          setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
          toast.error("Failed to send message");
        }
      } else if (data) {
        // Replace the temp message with the real one
        setMessages(prev => 
          prev.map(m => m.id === tempMessage.id ? data : m)
        );
        
        // Update the conversations list with the new last message
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
      toast.error("An error occurred while sending your message");
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendMessage
  };
};
