
import { toast } from "sonner";
import { Message, Conversation } from "@/types/chat";
import { useDemoMessages } from "./use-demo-messages";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage as sendMessageAPI,
  markMessagesAsRead
} from "@/integrations/supabase/client";

/**
 * Hook for message operations like fetching and sending
 */
export const useMessagesOperations = (userId: string) => {
  const { getDemoConversations, getDemoMessages, saveDemoMessage } = useDemoMessages();

  /**
   * Fetch user conversations
   */
  const fetchConversations = async (
    setConversations: (conversations: Conversation[]) => void,
    setActiveChat: (chatId: string | null) => void,
    setIsLoadingConversations: (loading: boolean) => void,
    setError: (error: Error | null) => void
  ) => {
    setIsLoadingConversations(true);
    setError(null);
    
    try {
      console.log("Fetching conversations for user:", userId);
      const { data, error } = await getUserConversations(userId);
      
      if (error) {
        console.error("Error fetching conversations:", error);
        setError(error);
        
        // Check for demo data in localStorage as a fallback
        const demoConversations = getDemoConversations();
        
        // Filter conversations related to this user
        const filteredConversations = demoConversations.filter(
          c => c.user1_id === userId || c.user2_id === userId
        );
        
        if (filteredConversations.length > 0) {
          setConversations(filteredConversations);
          // Don't access activeChat directly, it comes from parent component
          // We only need to set it if not already set
          setActiveChat(filteredConversations[0].id);
        }
        
        return;
      }
      
      if (data) {
        console.log("Fetched conversations:", data);
        setConversations(data);
        if (data.length > 0) {
          // Don't check activeChat directly, it comes from parent component
          setActiveChat(data[0].id);
        }
      } else {
        console.log("No conversations data returned");
      }
    } catch (err) {
      console.error("Exception fetching conversations:", err);
      setError(err as Error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  /**
   * Fetch messages for a conversation
   */
  const fetchMessages = async (
    conversationId: string,
    setMessages: (messages: Message[]) => void,
    setIsLoadingMessages: (loading: boolean) => void,
    setError: (error: Error | null) => void
  ) => {
    setIsLoadingMessages(true);
    setError(null);
    
    try {
      const { data, error } = await getConversationMessages(conversationId);
      
      if (error) {
        console.error("Error fetching messages:", error);
        setError(error);
        
        // Check for demo messages in localStorage as a fallback
        const demoMessages = getDemoMessages(conversationId);
        if (demoMessages.length > 0) {
          console.log("Using demo messages from localStorage:", demoMessages);
          setMessages(demoMessages);
        }
        
        return;
      }
      
      if (data) {
        console.log("Fetched messages:", data);
        setMessages(data);
        
        await markMessagesAsRead(conversationId, userId);
      }
    } catch (err) {
      console.error("Exception fetching messages:", err);
      setError(err as Error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  /**
   * Send a message in a conversation
   */
  const sendMessage = async (
    activeChat: string | null,
    content: string,
    conversations: Conversation[],
    setMessages: (messages: Message[]) => void,
    setConversations: (conversations: Conversation[]) => void,
    setIsSending: (sending: boolean) => void,
    setError: (error: Error | null) => void
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
      setMessages((prev: Message[]) => [...prev, tempMessage]);
      
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
          
          // Save to localStorage and get updated conversation
          const updatedConversation = saveDemoMessage(activeChat, tempMessage, userId, receiverId);
          
          if (updatedConversation) {
            // Update the conversations state with the new last message
            setConversations((prev: Conversation[]) => 
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
        setMessages((prev: Message[]) => 
          prev.map(m => m.id === tempMessage.id ? data : m)
        );
        
        setConversations((prev: Conversation[]) => 
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
    fetchConversations,
    fetchMessages,
    sendMessage
  };
};
