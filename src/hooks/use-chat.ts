import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import {
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead
} from "@/integrations/supabase/services/chat";

export const useChat = (userId: string, mentorId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Use ref to prevent multiple initializations
  const initializingRef = useRef(false);

  const initializeChat = useCallback(async () => {
    // Prevent concurrent initialization attempts
    if (initializingRef.current || !userId) return;

    initializingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log("Initializing chat between:", userId, "and", mentorId);

      // Get or create a conversation
      const { data: conversation, error } = await getOrCreateConversation(
        userId,
        mentorId
      );

      if (error) {
        console.error("Error initializing chat:", error);
        toast.error("Failed to initialize chat");
        setError("Failed to initialize chat. Please try again later.");
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

          // Mark messages as read
          await markMessagesAsRead(conversation.id, userId);
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
  }, [userId, mentorId]);

  // Only initialize once when the modal opens
  useEffect(() => {
    if (!initialized && userId && mentorId) {
      initializeChat();
    }
  }, [initialized, userId, mentorId, initializeChat]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!conversationId || !userId) {
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

      // Send the message to the backend
      const { data, error } = await sendMessage(
        conversationId,
        userId,
        mentorId,
        content
      );

      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        // Remove the temp message if there was an error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      } else if (data) {
        console.log("Message sent successfully:", data);
        // Replace the temp message with the real one
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An error occurred while sending your message");
      // Remove the temp message if there was an error
      setMessages(prev => prev.filter(m => m.id !== `temp-${Date.now()}`));
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
