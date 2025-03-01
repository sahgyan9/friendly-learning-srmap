
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const messagesData = [
  {
    id: 1,
    sender: "John Smith",
    avatar: "https://ui-avatars.com/api/?name=John+Smith&background=0D8ABC&color=fff",
    preview: "Hi there! I was wondering if you could help me with...",
    time: "10:30 AM",
    unread: true
  },
  {
    id: 2,
    sender: "Emily Johnson",
    avatar: "https://ui-avatars.com/api/?name=Emily+Johnson&background=FF5733&color=fff",
    preview: "Thanks for your help with the project yesterday!",
    time: "Yesterday",
    unread: false
  },
  {
    id: 3,
    sender: "Michael Chen",
    avatar: "https://ui-avatars.com/api/?name=Michael+Chen&background=27AE60&color=fff",
    preview: "Do you have time to meet tomorrow to discuss the...",
    time: "Yesterday",
    unread: false
  }
];

const Messages = () => {
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // In a real app with Supabase, you would handle sending the message here
    console.log("Sending message:", message);
    toast.info("Messaging functionality will be implemented with Supabase.");
    
    // For now, just provide feedback
    toast.success("Message sent!");
    setMessage("");
  };

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
                <input 
                  type="text" 
                  placeholder="Search messages..." 
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                {messagesData.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => setActiveChat(chat.id)}
                    className={`flex items-center gap-3 p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${activeChat === chat.id ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex-shrink-0">
                      <img 
                        src={chat.avatar} 
                        alt={chat.sender} 
                        className="w-12 h-12 rounded-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm font-semibold truncate">{chat.sender}</h3>
                        <span className="text-xs text-gray-500">{chat.time}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{chat.preview}</p>
                    </div>
                    {chat.unread && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat area */}
            <div className="hidden md:flex flex-col flex-1">
              {activeChat ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <img 
                        src={messagesData.find(chat => chat.id === activeChat)?.avatar} 
                        alt="Chat avatar" 
                        className="w-10 h-10 rounded-full"
                      />
                      <h3 className="font-semibold">
                        {messagesData.find(chat => chat.id === activeChat)?.sender}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-col gap-4">
                      <div className="self-start max-w-[70%]">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <p className="text-sm">Hi there! I was wondering if you could help me with a problem I'm having in my data structures course?</p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1">10:30 AM</span>
                      </div>
                      
                      <div className="self-end max-w-[70%]">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <p className="text-sm">Of course! What specific topic are you struggling with?</p>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 text-right block">10:32 AM</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 p-2 border border-gray-300 rounded-md"
                      />
                      <Button type="submit">Send</Button>
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
