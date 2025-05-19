
import React, { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Message } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  getSenderName?: (senderId: string) => string;
}

const MessageList = ({ messages, loading, currentUserId, getSenderName }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error("Invalid timestamp format:", timestamp);
      return "";
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getSenderDisplayName = (message: Message): string => {
    if (message.sender_id === currentUserId) {
      return "You";
    }
    
    // If the message has sender data attached, use that
    if (message.sender && message.sender.name) {
      return message.sender.name;
    }
    
    // Use the getSenderName function if provided
    if (getSenderName) {
      const name = getSenderName(message.sender_id);
      if (name && name !== "Contact") {
        return name;
      }
    }
    
    // Fallback - but try to avoid this
    return "Contact";
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
        const senderName = getSenderDisplayName(msg);

        return (
          <div
            key={msg.id}
            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
          >
            {!isMine && (
              <div className="mr-2 mt-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.sender?.profile_image} alt={senderName} />
                  <AvatarFallback>{getInitials(msg.sender?.name || '')}</AvatarFallback>
                </Avatar>
              </div>
            )}
            <div className="flex flex-col max-w-[75%]">
              {!isMine && (
                <span className="text-xs font-medium text-muted-foreground ml-1 mb-1">
                  {senderName}
                </span>
              )}
              <div
                className={`p-3 rounded-lg ${isMine
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted dark:bg-gray-800"
                  }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
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
