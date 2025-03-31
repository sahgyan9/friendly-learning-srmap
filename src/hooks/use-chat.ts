
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { getOrCreateConversation, getConversationMessages, sendMessage } from "@/integrations/supabase/services/chat";

export const useChat = (userId: string, mentorId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Initializing chat between:", userId, "and", mentorId);
      
      // Try to get or create a real conversation
      const { data: conversation, error } = await getOrCreateConversation(
        userId, 
        mentorId
      );
      
      if (error) {
        console.error("Error initializing chat:", error);
        if (error.message && error.message.includes("row-level security")) {
          console.log("Row-level security error detected - using simulated conversation for demo");
          // Generate a consistent ID based on user and mentor IDs
          const demoConversationId = `demo-${userId}-${mentorId}`;
          setConversationId(demoConversationId);
          
          // Load any stored messages for this conversation
          const storedMessages = localStorage.getItem('demo-messages');
          if (storedMessages) {
            try {
              const parsedMessages = JSON.parse(storedMessages);
              const messagesForConversation = parsedMessages[demoConversationId];
              if (messagesForConversation && Array.isArray(messagesForConversation)) {
                console.log("Using demo messages from localStorage:", messagesForConversation);
                setMessages(messagesForConversation);
              }
            } catch (localStorageErr) {
              console.error("Error parsing localStorage messages:", localStorageErr);
            }
          }
        } else {
          toast.error("Failed to initialize chat");
          setError("Failed to initialize chat. Please try again later.");
        }
      } else if (conversation) {
        console.log("Conversation created/retrieved successfully:", conversation);
        setConversationId(conversation.id);
        
        const { data: messageData, error: messagesError } = await getConversationMessages(
          conversation.id
        );
        
        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
          toast.error("Error loading messages");
        } else if (messageData) {
          setMessages(messageData);
          console.log("Fetched messages:", messageData);
        }
      }
    } catch (err) {
      console.error("Exception initializing chat:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [userId, mentorId]);
  
  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId) {
      toast.error("Chat not initialized");
      return;
    }
    
    setSending(true);
    try {
      // Add the message to the local state for immediate UI feedback
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: userId,
        receiver_id: mentorId,
        content: content,
        sent_at: new Date().toISOString(),
        is_read: false
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Check if using demo mode (localStorage)
      if (conversationId.startsWith('demo-')) {
        // Store conversation in localStorage to simulate persistence
        const storedConversations = localStorage.getItem('demo-conversations') 
          ? JSON.parse(localStorage.getItem('demo-conversations') || '{}') 
          : {};
        
        if (!storedConversations[conversationId]) {
          storedConversations[conversationId] = {
            id: conversationId,
            user1_id: userId,
            user2_id: mentorId,
            last_message_id: tempMessage.id,
            last_updated: new Date().toISOString(),
            user1: {
              id: userId,
              name: "John Student",
              profile_image: "https://ui-avatars.com/api/?name=John+Student&background=6366F1&color=fff"
            },
            user2: {
              id: mentorId,
              name: "Mentor Name",
              profile_image: "https://ui-avatars.com/api/?name=Mentor&background=6366F1&color=fff"
            },
            last_message: tempMessage
          };
        } else {
          storedConversations[conversationId].last_message = tempMessage;
          storedConversations[conversationId].last_updated = new Date().toISOString();
          storedConversations[conversationId].last_message_id = tempMessage.id;
        }
        
        // Store messages
        const storedMessages = localStorage.getItem('demo-messages') 
          ? JSON.parse(localStorage.getItem('demo-messages') || '{}') 
          : {};
        
        if (!storedMessages[conversationId]) {
          storedMessages[conversationId] = [];
        }
        
        storedMessages[conversationId].push(tempMessage);
        
        localStorage.setItem('demo-conversations', JSON.stringify(storedConversations));
        localStorage.setItem('demo-messages', JSON.stringify(storedMessages));
        
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }
      
      // Send the message to the real backend
      const { data, error } = await sendMessage(
        conversationId,
        userId,
        mentorId,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        
        // Fall back to localStorage if there's an error
        const demoConversationId = `demo-${userId}-${mentorId}`;
        
        // Store messages
        const storedMessages = localStorage.getItem('demo-messages') 
          ? JSON.parse(localStorage.getItem('demo-messages') || '{}') 
          : {};
        
        if (!storedMessages[demoConversationId]) {
          storedMessages[demoConversationId] = [];
        }
        
        storedMessages[demoConversationId].push(tempMessage);
        localStorage.setItem('demo-messages', JSON.stringify(storedMessages));
      } else if (data) {
        console.log("Message sent successfully:", data);
        // Replace the temp message with the real one
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An error occurred while sending your message");
    } finally {
      setSending(false);
    }
  }, [conversationId, userId, mentorId]);

  return {
    messages,
    loading,
    sending,
    error,
    conversationId,
    initializeChat,
    handleSendMessage,
  };
};
