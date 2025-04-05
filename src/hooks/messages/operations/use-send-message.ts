
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
    if (!activeChat) {
      console.error("No active chat to send message to");
      setError(new Error("No active chat"));
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    try {
      const currentConversation = conversations.find(c => c.id === activeChat);
      if (!currentConversation) {
        console.error("Conversation not found:", activeChat);
        setError(new Error("Conversation not found"));
        return;
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
      
      // Check if we're dealing with a demo conversation ID
      if (activeChat.startsWith('demo-')) {
        console.log("Using localStorage for demo messaging (demo ID detected)");
        
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
        
        // Simulate a response after a delay
        setTimeout(() => {
          const responseMessage: Message = {
            id: `demo-response-${Date.now()}`,
            conversation_id: activeChat,
            sender_id: receiverId,
            receiver_id: userId,
            content: `Thank you for your message: "${content}". I'll get back to you soon.`,
            sent_at: new Date().toISOString(),
            is_read: false
          };
          saveDemoMessage(activeChat, responseMessage, receiverId, userId);
          setMessages(prev => [...prev, responseMessage]);
        }, 1500);
        
        return;
      }
      
      // If not a demo conversation, try the API
      const { data, error } = await sendMessageAPI(
        activeChat,
        userId,
        receiverId,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        
        // Fall back to localStorage for demo
        if (error.message.includes("row-level security") || error.message.includes("invalid input syntax for type uuid")) {
          console.log("Using localStorage for demo messaging");
          
          // Create a demo conversation ID
          const demoConversationId = `demo-${userId}-${receiverId}`;
          
          // Save to localStorage and get updated conversation
          const updatedConversation = saveDemoMessage(demoConversationId, tempMessage, userId, receiverId);
          
          if (updatedConversation) {
            // Update the conversations state with the new last message
            setConversations(prev => 
              prev.map(conv => 
                conv.id === activeChat ? { ...updatedConversation, id: activeChat } : conv
              )
            );
          }
          
          // Simulate a response
          setTimeout(() => {
            const responseMessage: Message = {
              id: `demo-response-${Date.now()}`,
              conversation_id: demoConversationId,
              sender_id: receiverId,
              receiver_id: userId,
              content: `Thank you for your message: "${content}". I'll get back to you soon.`,
              sent_at: new Date().toISOString(),
              is_read: false
            };
            saveDemoMessage(demoConversationId, responseMessage, receiverId, userId);
            setMessages(prev => [...prev, responseMessage]);
          }, 1500);
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
