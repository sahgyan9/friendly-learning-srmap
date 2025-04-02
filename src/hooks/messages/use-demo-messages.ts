
import { useState, useEffect } from "react";
import { Message, Conversation } from "@/types/chat";

/**
 * Demo hook for storing messages locally when Supabase is not available
 */
export const useDemoMessages = () => {
  // Get demo conversations from localStorage
  const getDemoConversations = (): Conversation[] => {
    try {
      const storedConversations = localStorage.getItem("demo_conversations");
      return storedConversations ? JSON.parse(storedConversations) : [];
    } catch (error) {
      console.error("Error parsing demo conversations:", error);
      return [];
    }
  };

  // Get demo messages for a specific conversation
  const getDemoMessages = (conversationId: string): Message[] => {
    try {
      const storedMessages = localStorage.getItem(`demo_messages_${conversationId}`);
      return storedMessages ? JSON.parse(storedMessages) : [];
    } catch (error) {
      console.error("Error parsing demo messages:", error);
      return [];
    }
  };

  // Save a demo message
  const saveDemoMessage = (
    conversationId: string,
    message: Message,
    userId: string,
    receiverId: string
  ): Conversation | null => {
    try {
      // Get existing messages for this conversation
      const existingMessages = getDemoMessages(conversationId);
      const updatedMessages = [...existingMessages, message];
      
      // Store updated messages
      localStorage.setItem(
        `demo_messages_${conversationId}`,
        JSON.stringify(updatedMessages)
      );

      // Update conversations list
      const conversations = getDemoConversations();
      let conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        // Create new conversation
        conversation = {
          id: conversationId,
          user1_id: userId,
          user2_id: receiverId,
          last_message_id: message.id,
          last_updated: message.sent_at,
          user1: {
            id: userId,
            name: "You",
            profile_image: "https://ui-avatars.com/api/?name=You&background=6366F1&color=fff"
          },
          user2: {
            id: receiverId,
            name: "Contact",
            profile_image: "https://ui-avatars.com/api/?name=Contact&background=6366F1&color=fff"
          },
          last_message: message
        };
        
        const updatedConversations = [...conversations, conversation];
        localStorage.setItem(
          "demo_conversations", 
          JSON.stringify(updatedConversations)
        );
      } else {
        // Update existing conversation
        conversation.last_message = message;
        conversation.last_message_id = message.id;
        conversation.last_updated = message.sent_at;
        
        const updatedConversations = conversations.map(c => 
          c.id === conversationId ? conversation : c
        );
        
        localStorage.setItem(
          "demo_conversations", 
          JSON.stringify(updatedConversations)
        );
      }
      
      return conversation;
    } catch (error) {
      console.error("Error saving demo message:", error);
      return null;
    }
  };

  return {
    getDemoConversations,
    getDemoMessages,
    saveDemoMessage
  };
};
