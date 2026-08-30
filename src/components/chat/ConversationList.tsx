import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Loader2, MessageCircleMore, SearchX, Sparkles, UserPlus, GraduationCap, MessageSquare } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { useUserPresenceRealtime } from "@/hooks/useUserPresenceRealtime";
import OnlineStatus from "./OnlineStatus";
import { useOutboxMessages } from "@/hooks/useMessageOutbox";
import { searchCampusUsers, CampusUserResult } from "@/integrations/supabase/services/chat/user.service";

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
  const [discoveredUsers, setDiscoveredUsers] = useState<CampusUserResult[]>([]);
  const [isSearchingCampus, setIsSearchingCampus] = useState(false);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);

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

  // Debounced search for campus users when searching
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setDiscoveredUsers([]);
      setIsSearchingCampus(false);
      return;
    }

    setIsSearchingCampus(true);
    const timer = setTimeout(async () => {
      try {
        const users = await searchCampusUsers(query, currentUserId);
        // Exclude users already present in active filtered conversations
        const existingParticipantIds = new Set(
          filteredConversations.map((c) => {
            const other = getOtherUser(c);
            return other?.id;
          }).filter(Boolean)
        );

        setDiscoveredUsers(users.filter((u) => !existingParticipantIds.has(u.id)));
      } catch (err) {
        console.error("Error finding campus users:", err);
        setDiscoveredUsers([]);
      } finally {
        setIsSearchingCampus(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, filteredConversations, getOtherUser]);

  const handleStartChatWithDiscoveredUser = async (user: CampusUserResult) => {
    if (startingUserId || !onStartDirectChat) return;
    setStartingUserId(user.id);
    try {
      await onStartDirectChat(user.id, user.name);
    } finally {
      setStartingUserId(null);
    }
  };

  const getBadgeVariant = (badge?: string) => {
    switch (badge?.toLowerCase()) {
      case "mentor":
        return "bg-primary/15 text-primary border-primary/30";
      case "alumni":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "admin":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
  };

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

  const hasSearchQuery = Boolean(searchQuery.trim());
  const hasConversations = filteredConversations.length > 0;
  const hasDiscoveredUsers = discoveredUsers.length > 0;

  if (!hasConversations && !hasDiscoveredUsers && !isSearchingCampus) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
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
                className="rounded-full text-xs px-4 border-primary/30 hover:bg-primary/10 text-primary"
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
                  className="rounded-full px-4 text-xs bg-primary"
                >
                  Start new chat
                </Button>
              )}
              <Button size="sm" variant="outline" asChild className="rounded-full px-4 text-xs">
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
            <div className="px-2 py-1 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
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
              const queued = latestQueuedByConversation.get(conversation.id);
              const preview = queued?.content ?? conversation.last_message?.content ?? "No messages yet";

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
        </div>
      )}

      {/* Discovered campus users (people matching search) */}
      {hasSearchQuery && (
        <div className="space-y-1 pt-1">
          <div className="px-2 py-1 text-3xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Campus Directory</span>
            </span>
            {isSearchingCampus && (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            )}
          </div>

          {hasDiscoveredUsers ? (
            <ul className="space-y-1">
              {discoveredUsers.map((user) => {
                const isStarting = startingUserId === user.id;
                return (
                  <li key={user.id}>
                    <div
                      onClick={() => handleStartChatWithDiscoveredUser(user)}
                      className="group flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left transition-all duration-200 hover:bg-white/5 cursor-pointer border border-transparent hover:border-border/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0 border border-border/60 group-hover:ring-1 group-hover:ring-primary/40 transition-all">
                          <AvatarImage src={user.profile_image || undefined} alt={user.name} />
                          <AvatarFallback className="text-xs font-semibold bg-primary/15 text-primary">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
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
                            <p className="truncate text-xs text-muted-foreground/70 flex items-center gap-1">
                              <GraduationCap className="h-3 w-3 shrink-0" />
                              {user.department}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isStarting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChatWithDiscoveredUser(user);
                        }}
                        className="shrink-0 h-7 text-xs px-2.5 gap-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        {isStarting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
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
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
