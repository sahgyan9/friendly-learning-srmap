
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { 
  getOrCreateConversation,
  getConversationMessages, 
  sendMessage 
} from "@/integrations/supabase/services/chat";
import { useDemoMessages } from "./messages/use-demo-messages";

export const useChat = (userId: string, mentorId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // Use ref to prevent multiple initializations
  const initializingRef = useRef(false);
  
  const { getDemoMessages, saveDemoMessage } = useDemoMessages();
  
  const initializeChat = useCallback(async () => {
    // Prevent concurrent initialization attempts
    if (initializingRef.current) return;
    
    initializingRef.current = true;
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
          const demoMessages = getDemoMessages(demoConversationId);
          if (demoMessages && demoMessages.length > 0) {
            console.log("Using demo messages from localStorage:", demoMessages);
            setMessages(demoMessages);
          }
          setInitialized(true);
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
        setInitialized(true);
      }
    } catch (err) {
      console.error("Exception initializing chat:", err);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, [userId, mentorId, getDemoMessages]);
  
  // Only initialize once when the modal opens
  useEffect(() => {
    if (!initialized && userId && mentorId) {
      initializeChat();
    }
  }, [initialized, userId, mentorId, initializeChat]);
  
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
        // Store in localStorage
        saveDemoMessage(conversationId, tempMessage, userId, mentorId);
        
        // Simulate a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate a response from the mentor after a brief delay
        setTimeout(() => {
          const responseMessage: Message = {
            id: `demo-response-${Date.now()}`,
            conversation_id: conversationId,
            sender_id: mentorId,
            receiver_id: userId,
            content: `Thanks for your message: "${content}". I'll get back to you soon.`,
            sent_at: new Date().toISOString(),
            is_read: false
          };
          saveDemoMessage(conversationId, responseMessage, mentorId, userId);
          setMessages(prev => [...prev, responseMessage]);
        }, 1500);
        
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
        saveDemoMessage(demoConversationId, tempMessage, userId, mentorId);
        
        // Simulate a response in demo mode
        setTimeout(() => {
          const responseMessage: Message = {
            id: `demo-response-${Date.now()}`,
            conversation_id: demoConversationId,
            sender_id: mentorId,
            receiver_id: userId,
            content: `Thanks for your message: "${content}". I'll get back to you soon.`,
            sent_at: new Date().toISOString(),
            is_read: false
          };
          saveDemoMessage(demoConversationId, responseMessage, mentorId, userId);
          setMessages(prev => [...prev, responseMessage]);
        }, 1500);
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
  }, [conversationId, userId, mentorId, saveDemoMessage]);

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
