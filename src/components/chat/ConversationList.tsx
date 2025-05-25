
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
        <span className="ml-2">Loading conversations...</span>
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
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
    <div>
      {filteredConversations.map(conversation => {
        const otherUser = getOtherUser(conversation);
        const hasUnread = hasUnreadMessages(conversation.id);
        const lastMessageContent = conversation.last_message ? conversation.last_message.content : "";
        
        // Ensure we have a proper display name
        const displayName = otherUser?.name && otherUser.name.trim() !== "" ? otherUser.name : "User";

        return (
          <div
            key={conversation.id}
            onClick={() => setActiveChat(conversation.id)}
            className={`flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${activeChat === conversation.id ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
          >
            <div className="flex-shrink-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={otherUser?.profile_image} alt={displayName} />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-semibold truncate">
                  {displayName}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(conversation.last_updated)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{lastMessageContent}</p>
            </div>
            {hasUnread && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
