import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Loader2, MessageCircleMore, SearchX, Users, GraduationCap, MessageSquare, ShieldCheck } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getInitials, getBadgeVariant } from "@/utils/user-utils";
import { useUserPresenceRealtime } from "@/hooks/useUserPresenceRealtime";
import OnlineStatus from "./OnlineStatus";
import { useOutboxMessages } from "@/hooks/useMessageOutbox";
import { useCampusUserSearch } from "@/hooks/useCampusUserSearch";
import type { CampusUserResult } from "@/integrations/supabase/services/chat/user.service";

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
  onOpenCampusSearch?: (query?: string) => void;
  onStartDirectChat?: (targetUserId: string, targetUserName?: string) => Promise<void> | void;
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
  getUnreadCount,
  currentUserId,
  onOpenCampusSearch,
  onStartDirectChat,
}: ConversationListProps) => {
  const { isUserOnline } = useUserPresenceRealtime();
  const outboxMessages = useOutboxMessages();
  const [startingUserId, setStartingUserId] = useState<string | null>(null);
  const { results: discoveredUsers, isSearching: isSearchingCampus } = useCampusUserSearch(
    searchQuery,
    currentUserId,
    { debounceMs: 220 },
  );

  // The newest queued message per conversation. Built before the early
  // returns below, because hooks cannot run conditionally — and iterated in
  // order so the last one written wins, which is the one the row should show.
  const latestQueuedByConversation = React.useMemo(() => {
    const byConversation = new Map<string, (typeof outboxMessages)[number]>();
    for (const message of outboxMessages) {
      byConversation.set(message.conversationId, message);
    }
    return byConversation;
  }, [outboxMessages]);

  // Exclude users the caller already has a conversation with. Deliberately
  // built from the FULL conversation list, not filteredConversations: that
  // list is narrowed to conversations whose other-user *name* matches the
  // search box, while search_campus_users also matches on department/
  // keyword — so a department-matched existing contact wouldn't be excluded
  // here and would show up a second time as if never messaged before.
  const visibleDiscoveredUsers = React.useMemo(() => {
    const existingParticipantIds = new Set(
      conversations.map((c) => getOtherUser(c)?.id).filter(Boolean)
    );
    return discoveredUsers.filter((u) => !existingParticipantIds.has(u.id));
  }, [discoveredUsers, conversations, getOtherUser]);

  const handleStartChatWithDiscoveredUser = async (user: CampusUserResult) => {
    if (startingUserId || !onStartDirectChat) return;
    setStartingUserId(user.id);
    try {
      await onStartDirectChat(user.id, user.name);
    } finally {
      setStartingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasSearchQuery = Boolean(searchQuery.trim());
  const hasConversations = filteredConversations.length > 0;
  const hasDiscoveredUsers = visibleDiscoveredUsers.length > 0;

  if (!hasConversations && !hasDiscoveredUsers && !isSearchingCampus) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-secondary">
          {hasSearchQuery ? (
            <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden />
          ) : (
            <MessageCircleMore className="h-6 w-6 text-muted-foreground" aria-hidden />
          )}
        </div>

        {hasSearchQuery ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No conversations or campus members match "<span className="text-foreground">{searchQuery.trim()}</span>"
            </p>
            {onOpenCampusSearch && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenCampusSearch(searchQuery.trim())}
                >
                Search campus directory
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-1 text-sm font-semibold">No conversations yet</p>
            <p className="mb-5 text-xs text-muted-foreground">
              Start a chat with any student, mentor, or peer across SRM AP.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              {onOpenCampusSearch && (
                <Button
                  size="sm"
                  onClick={() => onOpenCampusSearch("")}
                >
                  Start new chat
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link to="/mentors">Browse mentors</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2 pb-24 lg:pb-2">
      {/* Existing conversations */}
      {hasConversations && (
        <div className="space-y-0.5">
          {hasSearchQuery && (
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Conversations
            </div>
          )}
          <ul className="space-y-0.5">
            {filteredConversations.map((conversation) => {
              const otherUser = getOtherUser(conversation);
              const unreadCount = getUnreadCount(conversation.id);
              const hasUnread = unreadCount > 0;
              const isActive = activeChat === conversation.id;
              const displayName = otherUser?.name?.trim() || "Student";
              const isOnline = isUserOnline(otherUser?.id);
              const isMentor = otherUser?.role === "mentor";
              const queued = latestQueuedByConversation.get(conversation.id);
              const preview = queued?.content ?? conversation.last_message?.content ?? "No messages yet";

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setActiveChat(conversation.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors duration-150",
                      isActive
                        ? "bg-primary/10"
                        : hasUnread
                          ? "hover:bg-accent"
                          : "hover:bg-accent",
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    )}

                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={otherUser?.profile_image} alt="" className="object-cover" />
                        <AvatarFallback className={cn(
                          "font-semibold text-sm transition-colors duration-200",
                          isActive ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"
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
                        <span className="flex min-w-0 items-center gap-1">
                          <span
                            className={cn(
                              "truncate text-sm transition-colors duration-200",
                              hasUnread ? "font-bold" : "font-medium",
                              isActive ? "text-foreground" : "text-foreground/90",
                            )}
                          >
                            {displayName}
                          </span>
                          {isMentor && (
                            <Badge variant="secondary" className="h-4 shrink-0 px-1 text-4xs">
                              <ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" /> Mentor
                            </Badge>
                          )}
                        </span>
                        <span className={cn(
                          "shrink-0 text-3xs tabular-nums transition-colors duration-200",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}>
                          {formatTime(conversation.last_updated)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        {queued &&
                          (queued.failed ? (
                            <AlertCircle
                              className="h-3 w-3 shrink-0 text-destructive"
                              aria-label="Not sent"
                            />
                          ) : (
                            <Clock
                              className="h-3 w-3 shrink-0 text-muted-foreground/70"
                              aria-label="Waiting to send"
                            />
                          ))}
                        <p
                          className={cn(
                            "truncate text-xs leading-relaxed transition-colors duration-200",
                            hasUnread ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {preview}
                        </p>
                        {hasUnread && (
                          <span
                            className="ml-auto flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-3xs font-semibold leading-none text-primary-foreground tabular"
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
        </div>
      )}

      {/* Discovered campus users (people matching search) */}
      {hasSearchQuery && (
        <div className="space-y-1 pt-1">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              <span>Campus directory</span>
            </span>
            {isSearchingCampus && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </div>

          {hasDiscoveredUsers ? (
            <ul className="space-y-1">
              {visibleDiscoveredUsers.map((user) => {
                const isStarting = startingUserId === user.id;
                return (
                  <li key={user.id}>
                    <div
                      onClick={() => handleStartChatWithDiscoveredUser(user)}
                      className="group flex items-center justify-between gap-2.5 rounded-lg p-2.5 text-left transition-colors duration-150 hover:bg-accent cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={user.profile_image || undefined} alt={user.name} />
                          <AvatarFallback className="text-xs font-semibold bg-secondary text-secondary-foreground">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-foreground">
                              {user.name}
                            </span>
                            {user.badge && (
                              <Badge
                                variant="outline"
                                className={cn("text-3xs py-0 px-1 font-medium", getBadgeVariant(user.badge))}
                              >
                                {user.badge}
                              </Badge>
                            )}
                          </div>

                          {user.department && (
                            <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 shrink-0" />
                              {user.department}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={isStarting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChatWithDiscoveredUser(user);
                        }}
                        className="h-8 shrink-0 gap-1 px-2.5 text-xs"
                      >
                        {!isStarting && <MessageSquare className="h-3 w-3" />}
                        <span>Chat</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            !hasConversations && isSearchingCampus && (
              <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching SRM AP directory…</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationList;
