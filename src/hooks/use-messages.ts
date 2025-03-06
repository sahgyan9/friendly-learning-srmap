import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Message, Conversation } from "@/types/chat";
import { 
  getUserConversations, 
  getConversationMessages, 
  sendMessage as sendMessageAPI, 
  markMessagesAsRead 
} from "@/integrations/supabase/client";

export const useMessages = (userId: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      setError(null);
      try {
        console.log("Fetching conversations for user:", userId);
        const { data, error } = await getUserConversations(userId);
        
        if (error) {
          console.error("Error fetching conversations:", error);
          setError(error);
          return;
        }
        
        if (data) {
          console.log("Fetched conversations:", data);
          setConversations(data);
          if (data.length > 0 && !activeChat) {
            setActiveChat(data[0].id);
          } else {
            console.log("No conversations data returned");
          }
        }
      } catch (err) {
        console.error("Exception fetching conversations:", err);
        setError(err as Error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [userId]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
    }
  }, [activeChat]);

  const fetchMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    setError(null);
    try {
      const { data, error } = await getConversationMessages(conversationId);
      
      if (error) {
        console.error("Error fetching messages:", error);
        setError(error);
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

  const sendMessage = async (content: string) => {
    if (!activeChat) return;
    
    setIsSending(true);
    setError(null);
    try {
      const currentConversation = conversations.find(c => c.id === activeChat);
      if (!currentConversation) return;
      
      const receiverId = currentConversation.user1_id === userId 
        ? currentConversation.user2_id 
        : currentConversation.user1_id;
      
      const { data, error } = await sendMessageAPI(
        activeChat,
        userId,
        receiverId,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        setError(error);
        return;
      }
      
      if (data) {
        setMessages(prev => [...prev, data]);
        
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
    conversations,
    messages,
    activeChat,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    setActiveChat,
    sendMessage,
  };
};
