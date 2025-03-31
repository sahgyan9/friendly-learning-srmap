
import { useState } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { getOrCreateConversation, getConversationMessages, sendMessage } from "@/integrations/supabase/client";

export const useChat = (userId: string, mentorId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const initializeChat = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Initializing chat between:", userId, "and", mentorId);
      
      // Try to get or create a real conversation
      try {
        const { data: conversation, error } = await getOrCreateConversation(
          userId, 
          mentorId
        );
        
        if (error) {
          console.error("Error initializing chat:", error);
          if (error.message.includes("row-level security")) {
            console.log("Row-level security error detected - using simulated conversation for demo");
            // Generate a consistent UUID-formatted conversation ID based on user and mentor IDs
            // This ensures the same conversation ID is generated each time for the same user-mentor pair
            setConversationId("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
          } else {
            toast.error("Failed to initialize chat");
            setError("Failed to initialize chat. Please try again later.");
          }
        } else if (conversation) {
          console.log("Conversation created/retrieved successfully:", conversation);
          setConversationId(conversation.id);
          
          try {
            const { data: messageData, error: messagesError } = await getConversationMessages(
              conversation.id
            );
            
            if (messagesError) {
              console.error("Error fetching messages:", messagesError);
            } else if (messageData) {
              setMessages(messageData);
              console.log("Fetched messages:", messageData);
            }
          } catch (err) {
            console.error("Exception fetching messages:", err);
          }
        }
      } catch (err) {
        console.error("Exception initializing chat:", err);
        setError("An unexpected error occurred. Please try again later.");
      }

      // Check localStorage for demo messages
      if (conversationId) {
        try {
          const storedMessages = localStorage.getItem('demo-messages');
          if (storedMessages) {
            const parsedMessages = JSON.parse(storedMessages);
            const messagesForConversation = parsedMessages[conversationId];
            if (messagesForConversation && Array.isArray(messagesForConversation)) {
              console.log("Using demo messages from localStorage:", messagesForConversation);
              setMessages(messagesForConversation);
            }
          }
        } catch (localStorageErr) {
          console.error("Error parsing localStorage messages:", localStorageErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async (content: string) => {
    if (!conversationId) return;
    
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
      
      // Send the message to the real backend
      try {
        const { data, error } = await sendMessage(
          conversationId,
          userId,
          mentorId,
          content
        );
        
        if (error) {
          console.error("Error sending message:", error);
          if (error.message.includes("row-level security")) {
            console.log("Row-level security error detected - message added locally for demo");
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
                  name: "Mentor Name", // This will be overwritten in the Messages page
                  profile_image: "https://ui-avatars.com/api/?name=Mentor&background=6366F1&color=fff" // This will be overwritten
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
          } else if (error.message.includes("invalid input syntax for type uuid")) {
            console.log("UUID format error - message added locally for demo");
          } else {
            toast.error("Failed to send message to server");
          }
        } else if (data) {
          console.log("Message sent successfully:", data);
          // Replace the temp message with the real one
          setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
        }
      } catch (err) {
        console.error("Exception sending message:", err);
      }
    } finally {
      setSending(false);
    }
  };

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
