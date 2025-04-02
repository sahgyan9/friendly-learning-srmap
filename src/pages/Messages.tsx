import { useState, useEffect } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Conversation } from "@/types/chat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatFooter from "@/components/chat/ChatFooter";
import { formatMessageTime } from "@/utils/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Use the sample user
const SAMPLE_USER = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // John Student
  name: "John Student",
  profile_image: "https://ui-avatars.com/api/?name=John+Student&background=6366F1&color=fff"
};

// Mock conversations and messages
const mockConversations = [
  {
    id: "conv1",
    user1_id: SAMPLE_USER.id,
    user2_id: "mentor1",
    last_message_id: "msg3",
    last_updated: new Date().toISOString(),
    user1: {
      id: SAMPLE_USER.id,
      name: SAMPLE_USER.name,
      profile_image: SAMPLE_USER.profile_image
    },
    user2: {
      id: "mentor1",
      name: "Jane Smith",
      profile_image: "https://ui-avatars.com/api/?name=Jane+Smith&background=6366F1&color=fff"
    },
    last_message: {
      id: "msg3",
      conversation_id: "conv1",
      sender_id: "mentor1",
      receiver_id: SAMPLE_USER.id,
      content: "Yes, I can help you with that React project!",
      sent_at: new Date().toISOString(),
      is_read: false
    }
  },
  {
    id: "conv2",
    user1_id: SAMPLE_USER.id,
    user2_id: "mentor2",
    last_message_id: "msg6",
    last_updated: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    user1: {
      id: SAMPLE_USER.id,
      name: SAMPLE_USER.name,
      profile_image: SAMPLE_USER.profile_image
    },
    user2: {
      id: "mentor2",
      name: "Mark Johnson",
      profile_image: "https://ui-avatars.com/api/?name=Mark+Johnson&background=6366F1&color=fff"
    },
    last_message: {
      id: "msg6",
      conversation_id: "conv2",
      sender_id: SAMPLE_USER.id,
      receiver_id: "mentor2",
      content: "When would you be available for a call?",
      sent_at: new Date(Date.now() - 86400000).toISOString(),
      is_read: true
    }
  }
];

const mockMessages = {
  conv1: [
    {
      id: "msg1",
      conversation_id: "conv1",
      sender_id: SAMPLE_USER.id,
      receiver_id: "mentor1",
      content: "Hi, I'm interested in getting help with a React project.",
      sent_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      is_read: true
    },
    {
      id: "msg2",
      conversation_id: "conv1",
      sender_id: "mentor1",
      receiver_id: SAMPLE_USER.id,
      content: "Hello! What kind of help do you need?",
      sent_at: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      is_read: true
    },
    {
      id: "msg3",
      conversation_id: "conv1",
      sender_id: SAMPLE_USER.id,
      receiver_id: "mentor1", 
      content: "I'm struggling with state management. Can you help?",
      sent_at: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
      is_read: true
    },
    {
      id: "msg4",
      conversation_id: "conv1",
      sender_id: "mentor1",
      receiver_id: SAMPLE_USER.id,
      content: "Yes, I can help you with that React project!",
      sent_at: new Date().toISOString(),
      is_read: false
    }
  ],
  conv2: [
    {
      id: "msg5",
      conversation_id: "conv2",
      sender_id: "mentor2",
      receiver_id: SAMPLE_USER.id,
      content: "Hi John, I looked at your machine learning project. Great work!",
      sent_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      is_read: true
    },
    {
      id: "msg6",
      conversation_id: "conv2",
      sender_id: SAMPLE_USER.id,
      receiver_id: "mentor2",
      content: "When would you be available for a call?",
      sent_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      is_read: true
    }
  ]
};

const Messages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (activeChat) {
      setIsLoadingMessages(true);
      setTimeout(() => {
        const chatMessages = mockMessages[activeChat as keyof typeof mockMessages] || [];
        setMessages(chatMessages);
        setIsLoadingMessages(false);
      }, 500);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  const getOtherUser = (conversation: Conversation) => {
    return conversation.user1_id === SAMPLE_USER.id ? conversation.user2 : conversation.user1;
  };

  const hasUnreadMessages = (conversationId: string) => {
    const chatMessages = mockMessages[conversationId as keyof typeof mockMessages] || [];
    return chatMessages.some(msg => 
      msg.receiver_id === SAMPLE_USER.id && 
      !msg.is_read
    );
  };

  const sendMessage = async (content: string): Promise<void> => {
    if (!activeChat) return;
    
    setIsSending(true);
    
    const conversation = conversations.find(c => c.id === activeChat);
    if (!conversation) {
      toast.error("Conversation not found");
      setIsSending(false);
      return;
    }
    
    const receiverId = conversation.user1_id === SAMPLE_USER.id 
      ? conversation.user2_id 
      : conversation.user1_id;
    
    const newMessage = {
      id: `new-${Date.now()}`,
      conversation_id: activeChat,
      sender_id: SAMPLE_USER.id,
      receiver_id: receiverId,
      content,
      sent_at: new Date().toISOString(),
      is_read: false
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    setConversations(prevConversations => {
      return prevConversations.map(conv => {
        if (conv.id === activeChat) {
          return {
            ...conv,
            last_message: newMessage,
            last_message_id: newMessage.id,
            last_updated: newMessage.sent_at
          };
        }
        return conv;
      });
    });
    
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsSending(false);
        
        if (Math.random() > 0.3) {
          setTimeout(() => {
            const mentor = getOtherUser(conversation);
            const responseMessage = {
              id: `response-${Date.now()}`,
              conversation_id: activeChat,
              sender_id: receiverId,
              receiver_id: SAMPLE_USER.id,
              content: `Thanks for your message! This is an automated response from ${mentor?.name}.`,
              sent_at: new Date().toISOString(),
              is_read: false
            };
            
            setMessages(prev => [...prev, responseMessage]);
            
            setConversations(prevConversations => {
              return prevConversations.map(conv => {
                if (conv.id === activeChat) {
                  return {
                    ...conv,
                    last_message: responseMessage,
                    last_message_id: responseMessage.id,
                    last_updated: responseMessage.sent_at
                  };
                }
                return conv;
              });
            });
          }, 3000);
        }
        resolve();
      }, 1000);
    });
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => {
        const otherUser = getOtherUser(conv);
        return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <h1 className="text-3xl font-bold mb-8">Messages</h1>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                Error loading conversations: {error.message || "Unknown error"}. Please try again later.
              </AlertDescription>
            </Alert>
          </div>
        </main>
        <ChatFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <h1 className="text-3xl font-bold mb-8">Messages</h1>
          
          <ChatContainer
            conversations={conversations}
            filteredConversations={filteredConversations}
            messages={messages}
            activeChat={activeChat}
            isLoadingConversations={isLoadingConversations}
            isLoadingMessages={isLoadingMessages}
            isSending={isSending}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentUserId={SAMPLE_USER.id}
            formatTime={formatMessageTime}
            getOtherUser={getOtherUser}
            setActiveChat={setActiveChat}
            hasUnreadMessages={hasUnreadMessages}
            handleSendMessage={sendMessage}
          />
        </div>
      </main>
      
      <ChatFooter />
    </div>
  );
};

export default Messages;
