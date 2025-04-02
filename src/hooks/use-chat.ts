
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";

export const useChat = (userId: string, mentorId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize chat (simulate backend interaction)
  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Initializing chat between:", userId, "and", mentorId);
      
      // Generate a consistent ID based on user and mentor IDs
      const demoConversationId = `demo-${userId}-${mentorId}`;
      setConversationId(demoConversationId);
      
      // Simulate API call delay
      setTimeout(() => {
        setMessages([]);
        setLoading(false);
      }, 1000);
      
    } catch (err) {
      console.error("Exception initializing chat:", err);
      setError("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
  }, [userId, mentorId]);
  
  // Send message (simulate backend interaction)
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
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate mentor response after a delay
      setTimeout(() => {
        const responseMessage: Message = {
          id: `response-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: mentorId,
          receiver_id: userId,
          content: "Thanks for reaching out! This is a simulated response.",
          sent_at: new Date().toISOString(),
          is_read: false
        };
        
        setMessages(prev => [...prev, responseMessage]);
      }, 2000);
      
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
