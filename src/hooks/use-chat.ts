import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { sendMessage } from "@/integrations/supabase/services/chat";

export const useChat = (userId: string, mentorId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize chat
  const initializeChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Initializing chat between:", userId, "and", mentorId);
      
      // Check for existing conversations
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${mentorId}),and(sender_id.eq.${mentorId},receiver_id.eq.${userId})`)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Existing conversation found, use mentor ID as conversation ID
        setConversationId(mentorId);
        
        // Fetch all messages in this conversation
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${mentorId}),and(sender_id.eq.${mentorId},receiver_id.eq.${userId})`)
          .order('timestamp', { ascending: true });
        
        if (messagesError) throw messagesError;
        
        // Transform to our Message type
        const formattedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          conversation_id: mentorId,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          content: msg.message_text,
          sent_at: msg.timestamp,
          is_read: msg.is_read
        }));
        
        setMessages(formattedMessages);
      } else {
        // No existing conversation, create a new one
        setConversationId(mentorId);
        setMessages([]);
      }
      
      // Mark received messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', mentorId)
        .eq('receiver_id', userId)
        .eq('is_read', false);
      
      // Set up real-time subscription for new messages
      setupMessagesSubscription(userId, mentorId);
      
    } catch (err: any) {
      console.error("Exception initializing chat:", err);
      setError(err.message || "An unexpected error occurred. Please try again later.");
      
      // Fallback to demo mode
      const demoConversationId = `demo-${userId}-${mentorId}`;
      setConversationId(demoConversationId);
      setMessages([]);
      
    } finally {
      setLoading(false);
    }
  }, [userId, mentorId]);
  
  const setupMessagesSubscription = useCallback((userId: string, mentorId: string) => {
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { 
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${mentorId},receiver_id=eq.${userId}`
      }, (payload) => {
        console.log('New message received:', payload);
        const newMsg = payload.new;
        
        // Add the new message to the state
        const message: Message = {
          id: newMsg.id,
          conversation_id: mentorId,
          sender_id: newMsg.sender_id,
          receiver_id: newMsg.receiver_id,
          content: newMsg.message_text,
          sent_at: newMsg.timestamp,
          is_read: newMsg.is_read
        };
        
        setMessages(prev => [...prev, message]);
        
        // Mark the message as read
        supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', newMsg.id)
          .then(({ error }) => {
            if (error) console.error('Error marking message as read:', error);
          });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Send message
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
      
      // Send message to Supabase
      const { data, error } = await sendMessage(
        conversationId,
        userId,
        mentorId,
        content
      );
      
      if (error) {
        console.error('Error sending message:', error);
        toast.error("Failed to send message. Please try again.");
        
        // Remove the temp message if it failed
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        return;
      }
      
      if (data) {
        // Replace the temporary message with the real one
        setMessages(prev => 
          prev.map(m => m.id === tempMessage.id ? data : m)
        );
      }
      
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An error occurred while sending your message");
    } finally {
      setSending(false);
    }
  }, [conversationId, userId, mentorId]);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      // This cleanup function will be called when the component unmounts
      const channel = supabase.channel('realtime:messages');
      supabase.removeChannel(channel);
    };
  }, []);

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
