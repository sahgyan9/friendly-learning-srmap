
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Check, Copy, CornerDownRight, Loader2, MessageCircleMore, Reply } from "lucide-react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import TypingIndicator from "./TypingIndicator";
import MessageStatus from "./MessageStatus";
import { isEmojiOnly, getEmojiCount, getEmojiFontSizeClass } from "@/utils/emoji-utils";
import { isToday, isYesterday, isSameYear } from "date-fns";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  conversationId: string | null;
  getSenderName?: (senderId: string) => string;
  onReply?: (message: Message) => void;
}

/** Messages from the same person within this window read as one utterance. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

const dayKey = (iso: string) => new Date(iso).toDateString();

function formatDayLabel(iso: string): string {
  const date = new Date(iso);

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(isSameYear(date, new Date()) ? {} : { year: "numeric" }),
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
  onReply,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const { typingUsers } = useTypingIndicator(conversationId, currentUserId);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setUnseenCount(0);
  }, []);

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

  const handleCopyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(id);
      toast.success("Message copied to clipboard");
      setTimeout(() => {
        setCopiedMessageId((curr) => (curr === id ? null : curr));
      }, 1800);
    } catch (err) {
      console.error("Failed to copy message:", err);
      toast.error("Failed to copy message");
    }
  };

  const scrollToMessage = (targetId: string) => {
    const el = document.getElementById(`chat-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId((curr) => (curr === targetId ? null : curr));
      }, 1600);
    }
  };

  const messageMap = useMemo(() => {
    const map = new Map<string, Message>();
    for (const msg of messages) {
      map.set(msg.id, msg);
    }
    return map;
  }, [messages]);

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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
        <span>Loading messages…</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <MessageCircleMore className="h-7 w-7 text-muted-foreground/60" aria-hidden />
        </div>
        <p className="font-semibold">No messages yet</p>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground/70">
          Say hello — share what you're working on and what you'd love help with.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        data-testid="message-scroller"
        className="h-full overflow-y-auto px-4 py-5 space-y-0"
      >
        {rows.map(({ message, startsDay, isFirstInGroup, isLastInGroup }, index) => {
          const previous = index > 0 ? rows[index - 1].message : null;
          const isMine = message.sender_id === currentUserId;
          const senderName = isMine ? "You" : getSenderName?.(message.sender_id) ?? "User";
          const emojiOnly = isEmojiOnly(message.content);
          const emojiCount = emojiOnly ? getEmojiCount(message.content) : 0;
          const prevEmojiOnly = previous ? isEmojiOnly(previous.content) : false;
          const isCopied = copiedMessageId === message.id;
          const isHighlighted = highlightedMessageId === message.id;

          // Resolve replied message if any
          const repliedMsg = message.reply_to_id ? messageMap.get(message.reply_to_id) : null;
          const replyData = message.reply_to || (repliedMsg ? {
            id: repliedMsg.id,
            sender_name: repliedMsg.sender?.name?.trim() || (repliedMsg.sender_id === currentUserId ? "You" : getSenderName?.(repliedMsg.sender_id) ?? "User"),
            content: repliedMsg.content,
          } : null);

          return (
            <React.Fragment key={message.id}>
              {/* Day separator */}
              {startsDay && (
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/8" />
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-2xs font-medium text-muted-foreground/70 backdrop-blur-sm">
                    {formatDayLabel(message.sent_at)}
                  </span>
                  <span className="h-px flex-1 bg-white/8" />
                </div>
              )}

              <div
                id={`chat-msg-${message.id}`}
                className={cn(
                  "group relative flex items-end gap-2 transition-all duration-300",
                  isMine ? "justify-end" : "justify-start",
                  isFirstInGroup
                    ? "mt-4"
                    : (emojiOnly || prevEmojiOnly)
                      ? "mt-2.5"
                      : "mt-0.5",
                )}
              >
                {/* Received: avatar placeholder column */}
                {!isMine &&
                  (isLastInGroup ? (
                    <Avatar className="h-7 w-7 shrink-0 ring-1 ring-white/10">
                      <AvatarImage src={message.sender?.profile_image} alt="" className="object-cover" />
                      <AvatarFallback className="bg-white/8 text-3xs font-semibold text-muted-foreground">
                        {getInitials(message.sender?.name || senderName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="w-7 shrink-0" aria-hidden />
                  ))}

                {/* WhatsApp-Style Hover Action Bar (For Sender's own messages: left of bubble) */}
                {isMine && (
                  <div className="mb-1 flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 dark:border-white/15 dark:bg-card/90">
                    <button
                      type="button"
                      onClick={() => onReply?.(message)}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Reply"
                      aria-label="Reply to message"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className={cn(
                        "rounded-full p-1 transition-colors",
                        isCopied
                          ? "text-emerald-500 hover:text-emerald-600"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                      )}
                      title={isCopied ? "Copied!" : "Copy message"}
                      aria-label="Copy message text"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}

                <div className={cn("flex max-w-[75%] flex-col sm:max-w-[65%]", isMine && "items-end")}>
                  <div
                    className={cn(
                      "relative whitespace-pre-wrap break-words transition-all duration-300",
                      isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse",
                      emojiOnly
                        ? cn("px-1.5 py-1 bg-transparent border-none shadow-none", getEmojiFontSizeClass(emojiCount))
                        : cn(
                            "px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                            isMine
                              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20"
                              : "border border-white/10 bg-white/6 text-foreground backdrop-blur-sm",
                            isMine
                              ? cn(
                                  "rounded-2xl",
                                  isFirstInGroup ? "rounded-br-sm" : "rounded-tr-sm rounded-br-sm",
                                  isLastInGroup && "rounded-br-2xl",
                                )
                              : cn(
                                  "rounded-2xl",
                                  isFirstInGroup ? "rounded-bl-sm" : "rounded-tl-sm rounded-bl-sm",
                                  isLastInGroup && "rounded-bl-2xl",
                                ),
                          ),
                    )}
                  >
                    {/* WhatsApp-Style Quoted Message Preview inside bubble */}
                    {replyData && (
                      <button
                        type="button"
                        onClick={() => scrollToMessage(replyData.id)}
                        className={cn(
                          "mb-2 block w-full rounded-lg p-2 text-left transition-all hover:opacity-85 select-none",
                          isMine
                            ? "border-l-3 border-primary-foreground/90 bg-black/20 text-primary-foreground"
                            : "border-l-3 border-primary bg-primary/10 text-foreground",
                        )}
                        title="Click to jump to quoted message"
                      >
                        <div className="flex items-center gap-1 text-2xs font-bold">
                          <CornerDownRight className="h-3 w-3 shrink-0 opacity-80" />
                          <span className="truncate">{replyData.sender_name}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs opacity-90">
                          {replyData.content}
                        </p>
                      </button>
                    )}

                    {message.content}
                  </div>

                  {/* One timestamp per group */}
                  {isLastInGroup && (
                    <div
                      className={cn(
                        "mt-1.5 flex items-center gap-1.5 px-1 text-3xs text-muted-foreground/60",
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

                {/* WhatsApp-Style Hover Action Bar (For Received messages: right of bubble) */}
                {!isMine && (
                  <div className="mb-1 flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 dark:border-white/15 dark:bg-card/90">
                    <button
                      type="button"
                      onClick={() => onReply?.(message)}
                      className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Reply"
                      aria-label="Reply to message"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(message.content, message.id)}
                      className={cn(
                        "rounded-full p-1 transition-colors",
                        isCopied
                          ? "text-emerald-500 hover:text-emerald-600"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                      )}
                      title={isCopied ? "Copied!" : "Copy message"}
                      aria-label="Copy message text"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        <TypingIndicator
          typingUsers={typingUsers}
          getUserName={(id) => getSenderName?.(id) ?? "Someone"}
        />
      </div>

      {/* Jump-to-latest button */}
      {!isPinnedToBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <Button
            size="sm"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto gap-1.5 rounded-full bg-primary/90 px-4 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary"
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

