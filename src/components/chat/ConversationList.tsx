
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationListProps {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  activeChat: string | null;
  isLoading: boolean;
  searchQuery: string;
  formatTime: (timestamp: string) => string;
  getOtherUser: (conversation: Conversation) => any;
  setActiveChat: (id: string) => void;
  hasUnreadMessages: (conversationId: string) => boolean;
  currentUserId: string;
}

const ConversationList = ({
  conversations,
  filteredConversations,
  activeChat,
  isLoading,
  searchQuery,
  formatTime,
  getOtherUser,
  setActiveChat,
  hasUnreadMessages,
  currentUserId
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading conversations...</span>
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        {searchQuery.trim() ? (
          <p className="text-muted-foreground text-sm">No conversations match your search</p>
        ) : (
          <>
            <p className="text-muted-foreground mb-2 text-sm">No conversations yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Connect with mentors to start chatting
            </p>
            <Button size="sm" asChild>
              <Link to="/mentors">Find Mentors</Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="divide-y divide-border">
      {filteredConversations.map(conversation => {
        const otherUser = getOtherUser(conversation);
        const hasUnread = hasUnreadMessages(conversation.id);
        const lastMessageContent = conversation.last_message ? conversation.last_message.content : "Start a conversation";
        
        const displayName = otherUser?.name?.trim() || "Unknown User";

        return (
          <div
            key={conversation.id}
            onClick={() => setActiveChat(conversation.id)}
            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
              activeChat === conversation.id ? 'bg-muted border-r-2 border-primary' : ''
            }`}
          >
            {/* Avatar with better sizing */}
            <div className="flex-shrink-0">
              <Avatar className="h-11 w-11 border-2 border-border">
                <AvatarImage 
                  src={otherUser?.profile_image} 
                  alt={displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Conversation details */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-sm font-medium truncate ${
                  hasUnread ? 'text-foreground' : 'text-foreground/90'
                }`}>
                  {displayName}
                </h3>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {formatTime(conversation.last_updated)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <p className={`text-xs truncate ${
                  hasUnread ? 'text-foreground/70 font-medium' : 'text-muted-foreground'
                }`}>
                  {lastMessageContent}
                </p>
                
                {/* Unread indicator */}
                {hasUnread && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2"></div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
