
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Send, Loader2, Search } from "lucide-react";
import { getUserConversations, getConversationMessages, sendMessage, markMessagesAsRead } from "@/integrations/supabase/client";
import { Message, Conversation } from "@/types/chat";

// Mock authenticated user for demo purposes
// In a real app, this would come from your auth system
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

  // Load conversations
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
          // Activate the first chat if there is one and none is active
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

  // Load messages when active chat changes
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
        
        // Mark messages as read
        await markMessagesAsRead(conversationId, MOCK_USER.id);
      }
    } catch (err) {
      console.error("Exception fetching messages:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;
    
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
        message
      );
      
      if (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
        return;
      }
      
      if (data) {
        setMessages(prev => [...prev, data]);
        setMessage("");
        
        // Update conversation in the list
        setConversations(prev => 
          prev.map(conv => 
            conv.id === activeChat 
              ? { ...conv, last_message: message, last_updated: new Date().toISOString() }
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

  // Get the other user in the conversation (not the current user)
  const getOtherUser = (conversation: Conversation) => {
    return conversation.user1_id === MOCK_USER.id ? conversation.user2 : conversation.user1;
  };

  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const otherUser = getOtherUser(conv);
        return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <h1 className="text-3xl font-bold mb-8">Messages</h1>
          
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-[calc(100vh-200px)] flex">
            {/* Messages sidebar */}
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
              
              <div>
                {isLoadingConversations ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2">Loading conversations...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    {searchQuery.trim() ? (
                      <p className="text-muted-foreground">No conversations match your search</p>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-2">No conversations yet</p>
                        <p className="text-sm text-muted-foreground">
                          Connect with mentors to start chatting
                        </p>
                        <Button className="mt-4" asChild>
                          <Link to="/mentors">Find Mentors</Link>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredConversations.map(conversation => {
                    const otherUser = getOtherUser(conversation);
                    // Check if there are unread messages from this conversation
                    const hasUnread = messages.some(msg => 
                      msg.conversation_id === conversation.id && 
                      msg.receiver_id === MOCK_USER.id && 
                      !msg.is_read
                    );
                    
                    return (
                      <div 
                        key={conversation.id}
                        onClick={() => setActiveChat(conversation.id)}
                        className={`flex items-center gap-3 p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${activeChat === conversation.id ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex-shrink-0">
                          <img 
                            src={otherUser?.profile_image} 
                            alt={otherUser?.name} 
                            className="w-12 h-12 rounded-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h3 className="text-sm font-semibold truncate">{otherUser?.name}</h3>
                            <span className="text-xs text-gray-500">
                              {formatTime(conversation.last_updated)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.last_message}</p>
                        </div>
                        {hasUnread && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            {/* Chat area */}
            <div className="hidden md:flex flex-col flex-1">
              {activeChat && conversations.length > 0 ? (
                <>
                  {/* Chat header */}
                  {(() => {
                    const currentConversation = conversations.find(c => c.id === activeChat);
                    if (!currentConversation) return null;
                    
                    const otherUser = getOtherUser(currentConversation);
                    
                    return (
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <img 
                            src={otherUser?.profile_image} 
                            alt={otherUser?.name} 
                            className="w-10 h-10 rounded-full"
                          />
                          <h3 className="font-semibold">{otherUser?.name}</h3>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="ml-2">Loading messages...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-muted-foreground mb-2">No messages yet</p>
                        <p className="text-sm text-muted-foreground">
                          Start the conversation by sending a message
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {messages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender_id === MOCK_USER.id ? 'justify-end' : 'justify-start'}`}>
                            <div className="self-start max-w-[70%]">
                              <div className={`${
                                msg.sender_id === MOCK_USER.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-gray-100'
                              } p-3 rounded-lg`}>
                                <p className="text-sm">{msg.content}</p>
                              </div>
                              <span className="text-xs text-gray-500 mt-1 block">
                                {formatTime(msg.sent_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Message input */}
                  <div className="p-4 border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border border-gray-300 rounded-md"
                        disabled={isLoadingMessages || isSending}
                      />
                      <Button 
                        type="submit" 
                        disabled={!message.trim() || isLoadingMessages || isSending}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send
                      </Button>
                    </form>
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
