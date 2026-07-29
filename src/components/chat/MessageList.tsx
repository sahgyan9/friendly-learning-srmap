
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Loader2, MessagesSquare } from "lucide-react";
import { Message } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import TypingIndicator from "./TypingIndicator";
import MessageStatus from "./MessageStatus";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  conversationId: string | null;
  getSenderName?: (senderId: string) => string;
}

/** Messages from the same person within this window read as one utterance. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const dayKey = (iso: string) => new Date(iso).toDateString();

function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const MessageList = ({
  messages,
  loading,
  currentUserId,
  conversationId,
  getSenderName,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const { typingUsers } = useTypingIndicator(conversationId, currentUserId);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    setUnseenCount(0);
  }, []);

  // The first paint of a thread should already be at the newest message rather
  // than animating down through the whole history.
  useEffect(() => {
    isFirstRender.current = true;
    setIsPinnedToBottom(true);
    setUnseenCount(0);
  }, [conversationId]);

  useEffect(() => {
    if (loading || messages.length === 0) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      scrollToBottom("auto");
      return;
    }

    if (isPinnedToBottom) {
      scrollToBottom("smooth");
    } else {
      // Reading older messages should not be interrupted; count instead.
      const newest = messages[messages.length - 1];
      if (newest?.sender_id !== currentUserId) setUnseenCount((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, loading]);

  useEffect(() => {
    if (typingUsers.length > 0 && isPinnedToBottom) scrollToBottom("smooth");
  }, [typingUsers.length, isPinnedToBottom, scrollToBottom]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setIsPinnedToBottom(atBottom);
    if (atBottom) setUnseenCount(0);
  };

  /**
   * Precomputes what each row needs to know about its neighbours: whether it
   * starts a new day, opens a group, or closes one. Doing it here keeps the
   * render body free of index arithmetic.
   */
  const rows = useMemo(
    () =>
      messages.map((message, index) => {
        const previous = index > 0 ? messages[index - 1] : null;
        const next = index < messages.length - 1 ? messages[index + 1] : null;

        const startsDay = !previous || dayKey(previous.sent_at) !== dayKey(message.sent_at);
        const gapBefore = previous
          ? new Date(message.sent_at).getTime() - new Date(previous.sent_at).getTime()
          : Infinity;
        const gapAfter = next
          ? new Date(next.sent_at).getTime() - new Date(message.sent_at).getTime()
          : Infinity;

        return {
          message,
          startsDay,
          isFirstInGroup:
            startsDay || previous?.sender_id !== message.sender_id || gapBefore > GROUP_WINDOW_MS,
          isLastInGroup:
            !next ||
            next.sender_id !== message.sender_id ||
            gapAfter > GROUP_WINDOW_MS ||
            dayKey(next.sent_at) !== dayKey(message.sent_at),
        };
      }),
    [messages],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading messages…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <MessagesSquare className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <p className="font-medium">No messages yet</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Say hello — mention what you're working on and what you'd like help with.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-contain px-4 py-4"
      >
        {rows.map(({ message, startsDay, isFirstInGroup, isLastInGroup }) => {
          const isMine = message.sender_id === currentUserId;
          const senderName = isMine ? "You" : getSenderName?.(message.sender_id) ?? "User";

          return (
            <React.Fragment key={message.id}>
              {startsDay && (
                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {formatDayLabel(message.sent_at)}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}

              <div
                className={cn(
                  "flex items-end gap-2",
                  isMine ? "justify-end" : "justify-start",
                  isFirstInGroup ? "mt-3" : "mt-0.5",
                )}
              >
                {!isMine &&
                  (isLastInGroup ? (
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={message.sender?.profile_image} alt="" className="object-cover" />
                      <AvatarFallback className="bg-muted text-[10px] font-medium">
                        {getInitials(message.sender?.name || senderName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    // Keeps the column aligned without repeating the avatar.
                    <span className="w-7 shrink-0" aria-hidden />
                  ))}

                <div className={cn("flex max-w-[78%] flex-col sm:max-w-[68%]", isMine && "items-end")}>
                  {!isMine && isFirstInGroup && (
                    <span className="mb-1 ml-1 text-xs font-medium text-muted-foreground">
                      {senderName}
                    </span>
                  )}

                  <div
                    className={cn(
                      "whitespace-pre-wrap break-words px-3.5 py-2 text-sm leading-relaxed",
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                      // Square off the inner corner so a run of messages reads
                      // as one block rather than a stack of separate pills.
                      isMine
                        ? cn("rounded-2xl", isFirstInGroup ? "rounded-br-md" : "rounded-tr-md rounded-br-md")
                        : cn("rounded-2xl", isFirstInGroup ? "rounded-bl-md" : "rounded-tl-md rounded-bl-md"),
                      isLastInGroup && (isMine ? "rounded-br-2xl" : "rounded-bl-2xl"),
                    )}
                  >
                    {message.content}
                  </div>

                  {/* One timestamp per group, not one per message. */}
                  {isLastInGroup && (
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1 px-1 text-[11px] text-muted-foreground",
                        isMine ? "justify-end" : "justify-start",
                      )}
                    >
                      <time dateTime={message.sent_at}>{formatTime(message.sent_at)}</time>
                      <MessageStatus
                        deliveryStatus={message.delivery_status || "sent"}
                        isOwnMessage={isMine}
                      />
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <TypingIndicator
          typingUsers={typingUsers}
          getUserName={(id) => getSenderName?.(id) ?? "Someone"}
        />

        <div ref={bottomRef} />
      </div>

      {/* Appears only when you have scrolled away from the newest message. */}
      {!isPinnedToBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto gap-1.5 rounded-full shadow-md"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            {unseenCount > 0
              ? `${unseenCount} new message${unseenCount === 1 ? "" : "s"}`
              : "Jump to latest"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessageList;
