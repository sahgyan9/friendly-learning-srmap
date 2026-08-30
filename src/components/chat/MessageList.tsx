
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  Copy,
  CornerDownRight,
  Loader2,
  MessageCircleMore,
  Pencil,
  Reply,
  Smile,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Message } from "@/types/chat";
import { retryQueuedMessage } from "@/lib/offline/messageOutbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { ChatMessageContent } from "./ChatMessageContent";
import { SwipeableMessage } from "./SwipeableMessage";
import TypingIndicator from "./TypingIndicator";
import MessageStatus from "./MessageStatus";
import { triggerHaptic } from "@/lib/haptics";
import { isEmojiOnly, getEmojiCount, getEmojiFontSizeClass } from "@/utils/emoji-utils";
import { isToday, isYesterday, isSameYear } from "date-fns";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  currentUserId: string;
  conversationId: string | null;
  getSenderName?: (senderId: string) => string;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => Promise<void>;
  onReaction?: (messageId: string, emoji: string) => Promise<void>;
}

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "😢"];

/** Messages from the same person within this window read as one utterance. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;
/** Message edit & delete maximum allowed window: 30 minutes */
const EDIT_DELETE_WINDOW_MS = 30 * 60 * 1000;

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
  onEdit,
  onDelete,
  onReaction,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  // Set by a long press on touch devices, where the hover action bar below
  // never gets a hover state to reveal it.
  const [activeActionsMsgId, setActiveActionsMsgId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { typingUsers } = useTypingIndicator(conversationId, currentUserId);

  useEffect(() => {
    if (!activeReactionMsgId && !activeActionsMsgId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeReactionMsgId && !target.closest(`[data-reaction-picker="${activeReactionMsgId}"]`)) {
        setActiveReactionMsgId(null);
      }
      if (activeActionsMsgId && !target.closest(`[data-message-actions="${activeActionsMsgId}"]`)) {
        setActiveActionsMsgId(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeReactionMsgId, activeActionsMsgId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setUnseenCount(0);
  }, []);

  useEffect(() => {
    isFirstRender.current = true;
    setIsPinnedToBottom(true);
    setUnseenCount(0);
    setActiveReactionMsgId(null);
    setActiveActionsMsgId(null);
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

  // When container height changes (e.g. mobile virtual keyboard opens/closes), keep anchored to latest message
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let prevHeight = el.clientHeight;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        if (newHeight !== prevHeight) {
          prevHeight = newHeight;
          if (isPinnedToBottom) {
            el.scrollTop = el.scrollHeight;
          }
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [isPinnedToBottom]);

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
        className="h-full overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-4 sm:py-5 space-y-0"
        style={{ WebkitOverflowScrolling: "touch" }}
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
          const isWithin30Min = (Date.now() - new Date(message.sent_at).getTime()) <= EDIT_DELETE_WINDOW_MS;

          // Still with the outbox: written offline, or given up on.
          const isPending =
            message.delivery_status === "queued" || message.delivery_status === "failed";

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

              <SwipeableMessage
                onReply={onReply ? () => onReply(message) : undefined}
                onLongPress={() => {
                  setActiveActionsMsgId(message.id);
                  setActiveReactionMsgId(message.id);
                }}
              >
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
                    <div
                      data-message-actions={message.id}
                      className={cn(
                        "mb-1 flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 dark:border-white/15 dark:bg-card/90",
                        activeActionsMsgId === message.id && "opacity-100",
                      )}
                    >
                      {/* Reaction Picker Button */}
                      <div className="relative" data-reaction-picker={message.id}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMsgId((curr) => (curr === message.id ? null : message.id));
                          }}
                          className={cn(
                            "rounded-full p-1 transition-colors",
                            activeReactionMsgId === message.id
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                          title="React"
                          aria-label="React to message"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>

                        {activeReactionMsgId === message.id && (
                          <div
                            className="absolute bottom-full right-0 z-30 mb-1.5 flex items-center gap-1 rounded-full border border-border/90 bg-background/95 p-1 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 dark:border-white/15 dark:bg-card/95"
                          >
                            {QUICK_REACTION_EMOJIS.map((emoji) => {
                              const hasReacted = message.viewer_reactions?.includes(emoji);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReaction?.(message.id, emoji);
                                    setActiveReactionMsgId(null);
                                    setActiveActionsMsgId(null);
                                  }}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-base transition-all hover:scale-125 active:scale-95",
                                    hasReacted ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-muted"
                                  )}
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => { onReply?.(message); setActiveActionsMsgId(null); }}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Reply"
                        aria-label="Reply to message"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleCopyMessage(message.content, message.id); setActiveActionsMsgId(null); }}
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
                      {isWithin30Min && onEdit && (
                        <button
                          type="button"
                          onClick={() => { onEdit(message); setActiveActionsMsgId(null); }}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Edit message (within 30m)"
                          aria-label="Edit message"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isWithin30Min && onDelete && (
                        <button
                          type="button"
                          onClick={() => { setMessageToDelete(message.id); setActiveActionsMsgId(null); }}
                          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Delete message (within 30m)"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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

                      <ChatMessageContent content={message.content} isOwnMessage={isMine} />
                      {message.is_edited && (
                        <span
                          className={cn(
                            "ml-1.5 inline-block text-3xs italic select-none font-normal",
                            isMine ? "text-primary-foreground/80" : "text-muted-foreground/75"
                          )}
                        >
                          (edited)
                        </span>
                      )}
                    </div>

                    {/* Direct Message Reaction Badges */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className={cn("mt-1 flex flex-wrap items-center gap-1", isMine ? "justify-end" : "justify-start")}>
                        {Object.entries(message.reactions).map(([emoji, count]) => {
                          const hasReacted = message.viewer_reactions?.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReaction?.(message.id, emoji)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all duration-150 select-none active:scale-95",
                                hasReacted
                                  ? "border-primary/50 bg-primary/15 text-primary font-semibold shadow-xs"
                                  : "border-border/70 bg-background/80 hover:bg-muted text-foreground/80 dark:border-white/10 dark:bg-card/70"
                              )}
                              title={hasReacted ? `You reacted ${emoji}` : `React with ${emoji}`}
                              aria-label={`Reaction ${emoji} count ${count}`}
                            >
                              <span className="text-sm leading-none">{emoji}</span>
                              {count > 1 && <span className="text-3xs font-medium">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* One timestamp per group — except for a message the
                        outbox is still holding, which shows its own.
                        'sent', 'delivered' and 'read' are the same for every
                        message in a group, so one tick speaks for all of them;
                        'queued' is not. A message that has not left the device
                        sitting above one that has, under a single tick, would
                        say the opposite of what is true. */}
                    {(isLastInGroup || isPending) && (
                      <div
                        className={cn(
                          "mt-1.5 flex items-center gap-1.5 px-1 text-3xs text-muted-foreground/60",
                          isMine ? "justify-end" : "justify-start",
                        )}
                      >
                        <time dateTime={message.sent_at}>{formatTime(message.sent_at)}</time>
                        <MessageStatus
                          deliveryStatus={message.is_read ? "read" : (message.delivery_status || "sent")}
                          isOwnMessage={isMine}
                        />
                      </div>
                    )}

                    {/* Outside the timestamp row above, which only renders for
                        the last message in a group: a message that could not
                        be sent needs its way out whether or not it happens to
                        be the one carrying the group's timestamp. */}
                    {isMine && message.delivery_status === "failed" && (
                      <div className="mt-1 flex justify-end px-1">
                        <button
                          type="button"
                          onClick={() => retryQueuedMessage(message.id)}
                          className="text-3xs font-medium text-destructive underline-offset-2 hover:underline"
                        >
                          Not sent · Retry
                        </button>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp-Style Hover Action Bar (For Received messages: right of bubble) */}
                  {!isMine && (
                    <div
                      data-message-actions={message.id}
                      className={cn(
                        "mb-1 flex items-center gap-0.5 rounded-full border border-border/80 bg-background/95 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 dark:border-white/15 dark:bg-card/90",
                        activeActionsMsgId === message.id && "opacity-100",
                      )}
                    >
                      {/* Reaction Picker Button */}
                      <div className="relative" data-reaction-picker={message.id}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMsgId((curr) => (curr === message.id ? null : message.id));
                          }}
                          className={cn(
                            "rounded-full p-1 transition-colors",
                            activeReactionMsgId === message.id
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          )}
                          title="React"
                          aria-label="React to message"
                        >
                          <Smile className="h-3.5 w-3.5" />
                        </button>

                        {activeReactionMsgId === message.id && (
                          <div
                            className="absolute bottom-full left-0 z-30 mb-1.5 flex items-center gap-1 rounded-full border border-border/90 bg-background/95 p-1 shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 dark:border-white/15 dark:bg-card/95"
                          >
                            {QUICK_REACTION_EMOJIS.map((emoji) => {
                              const hasReacted = message.viewer_reactions?.includes(emoji);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReaction?.(message.id, emoji);
                                    setActiveReactionMsgId(null);
                                    setActiveActionsMsgId(null);
                                  }}
                                  className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full text-base transition-all hover:scale-125 active:scale-95",
                                    hasReacted ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-muted"
                                  )}
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => { onReply?.(message); setActiveActionsMsgId(null); }}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Reply"
                        aria-label="Reply to message"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleCopyMessage(message.content, message.id); setActiveActionsMsgId(null); }}
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
              </SwipeableMessage>
            </React.Fragment>
          );
        })}

        <TypingIndicator
          typingUsers={typingUsers}
          getUserName={(id) => getSenderName?.(id) ?? "Someone"}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(messageToDelete)} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? It will be permanently removed for both participants in this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!messageToDelete || !onDelete) return;
                try {
                  setIsDeleting(true);
                  await onDelete(messageToDelete);
                  setMessageToDelete(null);
                } catch (err) {
                  console.error("Failed to delete message:", err);
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

