
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Conversation } from "@/types/chat";

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
  hasUnreadMessages
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
  
  return (
    <div>
      {filteredConversations.map(conversation => {
        const otherUser = getOtherUser(conversation);
        const hasUnread = hasUnreadMessages(conversation.id);
        
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
      })}
    </div>
  );
};

export default ConversationList;
