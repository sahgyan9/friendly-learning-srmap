
import { Message, Conversation } from "@/types/chat";

/**
 * Utility functions for handling demo messages in localStorage
 */
export const useDemoMessages = () => {
  /**
   * Gets demo conversations from localStorage
   */
  const getDemoConversations = () => {
    try {
      const storedConversations = localStorage.getItem('demo-conversations');
      if (storedConversations) {
        const parsedConversations = JSON.parse(storedConversations);
        return Object.values(parsedConversations) as Conversation[];
      }
    } catch (err) {
      console.error("Error parsing localStorage conversations:", err);
    }
    return [];
  };

  /**
   * Gets demo messages for a conversation from localStorage
   */
  const getDemoMessages = (conversationId: string) => {
    try {
      const storedMessages = localStorage.getItem('demo-messages');
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages);
        return parsedMessages[conversationId] || [];
      }
    } catch (err) {
      console.error("Error parsing localStorage messages:", err);
    }
    return [];
  };

  /**
   * Saves a demo message to localStorage
   */
  const saveDemoMessage = (
    conversationId: string,
    message: Message,
    userId: string,
    receiverId: string
  ) => {
    try {
      // Store messages
      const storedMessages = localStorage.getItem('demo-messages')
        ? JSON.parse(localStorage.getItem('demo-messages') || '{}')
        : {};
      
      if (!storedMessages[conversationId]) {
        storedMessages[conversationId] = [];
      }
      
      storedMessages[conversationId].push(message);
      localStorage.setItem('demo-messages', JSON.stringify(storedMessages));
      
      // Update conversation with last message
      const storedConversations = localStorage.getItem('demo-conversations')
        ? JSON.parse(localStorage.getItem('demo-conversations') || '{}')
        : {};
      
      if (!storedConversations[conversationId]) {
        storedConversations[conversationId] = {
          id: conversationId,
          user1_id: userId,
          user2_id: receiverId,
          last_message_id: message.id,
          last_updated: new Date().toISOString(),
          user1: {
            id: userId,
            name: "John Student",
            profile_image: "https://ui-avatars.com/api/?name=John+Student&background=6366F1&color=fff"
          },
          user2: {
            id: receiverId,
            name: "Mentor Name",
            profile_image: "https://ui-avatars.com/api/?name=Mentor&background=6366F1&color=fff"
          },
          last_message: message
        };
      } else {
        storedConversations[conversationId].last_message = message;
        storedConversations[conversationId].last_updated = new Date().toISOString();
        storedConversations[conversationId].last_message_id = message.id;
      }
      
      localStorage.setItem('demo-conversations', JSON.stringify(storedConversations));
      
      return storedConversations[conversationId] as Conversation;
    } catch (err) {
      console.error("Error updating localStorage:", err);
      return null;
    }
  };

  return {
    getDemoConversations,
    getDemoMessages,
    saveDemoMessage
  };
};
