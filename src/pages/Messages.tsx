import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Loader2, Search } from "lucide-react";
import { getUserConversations, getConversationMessages, sendMessage, markMessagesAsRead } from "@/integrations/supabase/client";
import { Message, Conversation } from "@/types/chat";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import ConversationList from "@/components/chat/ConversationList";
import ChatHeader from "@/components/chat/ChatHeader";
import { Link } from "react-router-dom";

const MOCK_USER = {
  id: "user-123",
  name: "Current User",
  profile_image: "https://ui-avatars.com/api/?name=Current+User&background=6366F1&color=fff"
};

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const { data, error } = await getUserConversations(MOCK_USER.id);
        
        if (error) {
          console.error("Error fetching conversations:", error);
          toast.error("Failed to load conversations");
          return;
        }
        
        if (data) {
          setConversations(data);
          if (data.length > 0 && !activeChat) {
            setActiveChat(data[0].id);
          }
        }
      } catch (err) {
        console.error("Exception fetching conversations:", err);
        toast.error("An unexpected error occurred");
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat);
    }
  }, [activeChat]);

  const fetchMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await getConversationMessages(conversationId);
      
      if (error) {
        console.error("Error fetching messages:", error);
        toast.error("Failed to load messages");
        return;
      }
      
      if (data) {
        setMessages(data);
        
        await markMessagesAsRead(conversationId, MOCK_USER.id);
      }
    } catch (err) {
      console.error("Exception fetching messages:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChat) return;
    
    setIsSending(true);
    try {
      const currentConversation = conversations.find(c => c.id === activeChat);
      if (!currentConversation) return;
      
      const receiverId = currentConversation.user1_id === MOCK_USER.id 
        ? currentConversation.user2_id 
        : currentConversation.user1_id;
      
      const { data, error } = await sendMessage(
        activeChat,
        MOCK_USER.id,
        receiverId,
        content
      );
      
      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }
      
      if (data) {
        setMessages(prev => [...prev, data]);
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === activeChat 
              ? { ...conv, last_message: content, last_updated: new Date().toISOString() }
              : conv
          )
        );
      }
    } catch (err) {
      console.error("Exception sending message:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getOtherUser = (conversation: Conversation) => {
    return conversation.user1_id === MOCK_USER.id ? conversation.user2 : conversation.user1;
  };

  const hasUnreadMessages = (conversationId: string) => {
    return messages.some(msg => 
      msg.conversation_id === conversationId && 
      msg.receiver_id === MOCK_USER.id && 
      !msg.is_read
    );
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const otherUser = getOtherUser(conv);
        return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  const currentConversation = conversations.find(c => c.id === activeChat);

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <h1 className="text-3xl font-bold mb-8">Messages</h1>
          
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-[calc(100vh-200px)] flex">
            <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input 
                    type="text" 
                    placeholder="Search messages..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <ConversationList 
                conversations={conversations}
                filteredConversations={filteredConversations}
                activeChat={activeChat}
                isLoading={isLoadingConversations}
                searchQuery={searchQuery}
                formatTime={formatTime}
                getOtherUser={getOtherUser}
                setActiveChat={setActiveChat}
                hasUnreadMessages={hasUnreadMessages}
              />
            </div>
            
            <div className="hidden md:flex flex-col flex-1">
              {activeChat && conversations.length > 0 ? (
                <>
                  <ChatHeader 
                    conversation={currentConversation} 
                    getOtherUser={getOtherUser} 
                  />
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <MessageList 
                      messages={messages}
                      loading={isLoadingMessages}
                      currentUserId={MOCK_USER.id}
                    />
                  </div>
                  
                  <div className="p-4 border-t border-gray-200">
                    <MessageInput 
                      onSendMessage={handleSendMessage}
                      disabled={isLoadingMessages}
                      sending={isSending}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                    <p className="text-muted-foreground">
                      Choose a conversation from the sidebar to start chatting
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-8 bg-white border-t border-gray-200">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link to="/" className="text-xl font-bold text-primary tracking-tight flex items-center">
                <span className="mr-1">Friendly</span>
                <span className="text-gray-700">Learning</span>
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                Connecting students with mentors at SRM AP
              </p>
            </div>
            
            <div className="flex space-x-6">
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Friendly Learning. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Messages;
