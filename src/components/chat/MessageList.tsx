
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

    if (message.sender && message.sender.name && message.sender.name.trim() !== "") {
      return message.sender.name;
    }

    if (getSenderName) {
      const nameFromProp = getSenderName(message.sender_id);
      if (nameFromProp && nameFromProp.trim() !== "" && nameFromProp !== "Contact") {
        return nameFromProp;
      }
    }

    return "User";
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading messages...</span>
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
    <div className="flex flex-col gap-4 p-4">
      {messages.map((msg, index) => {
        const isMine = msg.sender_id === currentUserId;
        const senderName = getSenderDisplayName(msg);
        const showAvatar = !isMine;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isFirstInGroup = !prevMessage || prevMessage.sender_id !== msg.sender_id;

        return (
          <div
            key={msg.id}
            className={`flex ${isMine ? "justify-end" : "justify-start"} ${
              isFirstInGroup ? "mt-4" : "mt-1"
            }`}
          >
            {/* Avatar for received messages */}
            {showAvatar && isFirstInGroup && (
              <div className="mr-3 mt-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={msg.sender?.profile_image} 
                    alt={senderName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {getInitials(msg.sender?.name || senderName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Spacer for subsequent messages in group */}
            {showAvatar && !isFirstInGroup && (
              <div className="w-11 mr-3"></div>
            )}

            <div className="flex flex-col max-w-[70%]">
              {/* Sender name for first message in group */}
              {showAvatar && isFirstInGroup && (
                <span className="text-xs font-medium text-muted-foreground ml-3 mb-1">
                  {senderName}
                </span>
              )}

              {/* Message bubble */}
              <div
                className={`px-4 py-2 rounded-2xl max-w-full break-words ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>

              {/* Timestamp */}
              <span className={`text-xs text-muted-foreground mt-1 ${
                isMine ? "text-right mr-1" : "text-left ml-3"
              }`}>
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
