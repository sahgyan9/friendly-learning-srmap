
import React, { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
}

const MessageList = ({ messages, loading, currentUserId }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading messages...</span>
      </div>
    );
  }
  
  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center flex-col text-center px-4">
        <p className="text-muted-foreground mb-2">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Start your conversation by sending a message below.
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => {
        const isMine = msg.sender_id === currentUserId;
        return (
          <div 
            key={msg.id} 
            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col max-w-[75%]">
              <div 
                className={`p-3 rounded-lg ${
                  isMine 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-1 px-1">
                {formatTime(msg.sent_at)}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
