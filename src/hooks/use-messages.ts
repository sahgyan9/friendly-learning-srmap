
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
          
          // Check for demo data in localStorage as a fallback
          try {
            const storedConversations = localStorage.getItem('demo-conversations');
            if (storedConversations) {
              const parsedConversations = JSON.parse(storedConversations);
              const conversationsArray = Object.values(parsedConversations) as Conversation[];
              console.log("Using demo conversations from localStorage:", conversationsArray);
              
              // Filter conversations related to this user
              const filteredConversations = conversationsArray.filter(
                c => c.user1_id === userId || c.user2_id === userId
              );
              
              if (filteredConversations.length > 0) {
                setConversations(filteredConversations);
                if (!activeChat) {
                  setActiveChat(filteredConversations[0].id);
                }
              }
            }
          } catch (localStorageErr) {
            console.error("Error parsing localStorage conversations:", localStorageErr);
          }
          
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
        
        // Check for demo messages in localStorage as a fallback
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
        
        // Fall back to localStorage for demo
        if (error.message.includes("row-level security") || error.message.includes("invalid input syntax for type uuid")) {
          console.log("Using localStorage for demo messaging");
          
          const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: activeChat,
            sender_id: userId,
            receiver_id: receiverId,
            content: content,
            sent_at: new Date().toISOString(),
            is_read: false
          };
          
          // Update messages state
          setMessages(prev => [...prev, tempMessage]);
          
          // Store in localStorage
          try {
            const storedMessages = localStorage.getItem('demo-messages') 
              ? JSON.parse(localStorage.getItem('demo-messages') || '{}') 
              : {};
            
            if (!storedMessages[activeChat]) {
              storedMessages[activeChat] = [];
            }
            
            storedMessages[activeChat].push(tempMessage);
            
            // Also update the conversation's last message
            const storedConversations = localStorage.getItem('demo-conversations') 
              ? JSON.parse(localStorage.getItem('demo-conversations') || '{}') 
              : {};
              
            if (storedConversations[activeChat]) {
              storedConversations[activeChat].last_message = tempMessage;
              storedConversations[activeChat].last_updated = new Date().toISOString();
              storedConversations[activeChat].last_message_id = tempMessage.id;
            }
            
            localStorage.setItem('demo-messages', JSON.stringify(storedMessages));
            localStorage.setItem('demo-conversations', JSON.stringify(storedConversations));
            
            // Update the conversations state with the new last message
            setConversations(prev => 
              prev.map(conv => 
                conv.id === activeChat 
                  ? { 
                      ...conv, 
                      last_message: tempMessage,
                      last_message_id: tempMessage.id,
                      last_updated: new Date().toISOString() 
                    }
                  : conv
              )
            );
          } catch (localStorageErr) {
            console.error("Error updating localStorage:", localStorageErr);
          }
        } else {
          setError(error);
          return;
        }
      } else if (data) {
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
