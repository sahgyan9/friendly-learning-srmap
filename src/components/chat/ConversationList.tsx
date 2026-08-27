
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircleMore, SearchX } from "lucide-react";
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
  getUnreadCount: (conversationId: string) => number;
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
  getUnreadCount,
}: ConversationListProps) => {
  const { isUserOnline } = useUserPresenceRealtime();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl p-2.5 animate-pulse">
            <div className="h-11 w-11 shrink-0 rounded-full bg-white/8" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 rounded-full bg-white/8" />
              <div className="h-3 w-40 rounded-full bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          {searchQuery.trim() ? (
            <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden />
          ) : (
            <MessageCircleMore className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
        </div>

        {searchQuery.trim() ? (
          <p className="text-sm text-muted-foreground">
            No conversations match "<span className="text-foreground">{searchQuery.trim()}</span>"
          </p>
        ) : (
          <>
            <p className="mb-1 text-sm font-semibold">No conversations yet</p>
            <p className="mb-5 text-xs text-muted-foreground">
              Message a mentor from their profile to get started.
            </p>
            <Button size="sm" asChild className="rounded-full px-5">
              <Link to="/mentors">Browse mentors</Link>
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="space-y-0.5 p-2 pb-24 lg:pb-2">
      {filteredConversations.map((conversation) => {
        const otherUser = getOtherUser(conversation);
        const unreadCount = getUnreadCount(conversation.id);
        const hasUnread = unreadCount > 0;
        const isActive = activeChat === conversation.id;
        const displayName = otherUser?.name?.trim() || "Student";
        const isOnline = isUserOnline(otherUser?.id);
        const preview = conversation.last_message?.content ?? "No messages yet";

        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => setActiveChat(conversation.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isActive
                  ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent shadow-sm ring-1 ring-primary/20"
                  : hasUnread
                    ? "bg-sky-400/[0.06] hover:bg-sky-400/10"
                    : "hover:bg-white/5",
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_0px_hsl(var(--primary))]" />
              )}

              <div className="relative shrink-0">
                <Avatar className={cn("h-11 w-11 transition-all duration-200", isActive && "ring-2 ring-primary/40 ring-offset-1 ring-offset-transparent")}>
                  <AvatarImage src={otherUser?.profile_image} alt="" className="object-cover" />
                  <AvatarFallback className={cn(
                    "font-semibold text-sm transition-colors duration-200",
                    isActive ? "bg-primary/20 text-primary" : "bg-white/8 text-muted-foreground"
                  )}>
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
                      "truncate text-sm transition-colors duration-200",
                      hasUnread ? "font-bold" : "font-medium",
                      isActive ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {displayName}
                  </span>
                  <span className={cn(
                    "shrink-0 text-3xs tabular-nums transition-colors duration-200",
                    isActive ? "text-primary/80" : "text-muted-foreground/60"
                  )}>
                    {formatTime(conversation.last_updated)}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center gap-2">
                  <p
                    className={cn(
                      "truncate text-xs leading-relaxed transition-colors duration-200",
                      hasUnread ? "font-semibold text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {preview}
                  </p>
                  {hasUnread && (
                    <span
                      className="ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-bold leading-none text-destructive-foreground"
                      aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
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
