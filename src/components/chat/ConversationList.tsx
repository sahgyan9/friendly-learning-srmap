
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, MessagesSquare, SearchX } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { useUserPresenceRealtime } from "@/hooks/useUserPresenceRealtime";
import OnlineStatus from "./OnlineStatus";

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
  filteredConversations,
  activeChat,
  isLoading,
  searchQuery,
  formatTime,
  getOtherUser,
  setActiveChat,
  hasUnreadMessages,
}: ConversationListProps) => {
  const { isUserOnline } = useUserPresenceRealtime();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading conversations…
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
          {searchQuery.trim() ? (
            <SearchX className="h-5 w-5 text-muted-foreground" aria-hidden />
          ) : (
            <MessagesSquare className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
        </div>

        {searchQuery.trim() ? (
          <p className="text-sm text-muted-foreground">
            No conversations match “{searchQuery.trim()}”
          </p>
        ) : (
          <>
            <p className="mb-1 text-sm font-medium">No conversations yet</p>
            <p className="mb-4 text-xs text-muted-foreground">
              Message a mentor from their profile to start one.
            </p>
            <Button size="sm" asChild>
              <Link to="/mentors">Browse mentors</Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="p-2">
      {filteredConversations.map((conversation) => {
        const otherUser = getOtherUser(conversation);
        const hasUnread = hasUnreadMessages(conversation.id);
        const isActive = activeChat === conversation.id;
        const displayName = otherUser?.name?.trim() || "Unknown User";
        const isOnline = isUserOnline(otherUser?.id);
        const preview = conversation.last_message?.content ?? "No messages yet";

        return (
          <li key={conversation.id}>
            {/* A button, not a div with onClick — this is focusable and
                operable from the keyboard, which the previous row was not. */}
            <button
              type="button"
              onClick={() => setActiveChat(conversation.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={otherUser?.profile_image} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary/10 font-medium text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatus isOnline={isOnline} size="sm" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      hasUnread ? "font-semibold" : "font-medium",
                      isActive && "text-primary",
                    )}
                  >
                    {displayName}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatTime(conversation.last_updated)}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center gap-2">
                  <p
                    className={cn(
                      "truncate text-xs",
                      hasUnread ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {preview}
                  </p>
                  {/* A dot beats a red badge: it marks the row without
                      claiming a count the data can't back up. */}
                  {hasUnread && (
                    <span
                      className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-label="Unread messages"
                    />
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default ConversationList;
