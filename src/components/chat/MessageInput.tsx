
import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2, CornerDownRight, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import EmojiPicker from "./EmojiPicker";
import { Message } from "@/types/chat";

interface MessageInputProps {
  onSendMessage: (content: string, replyTo?: Message | null) => Promise<void>;
  disabled: boolean;
  sending: boolean;
  conversationId: string | null;
  userId: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: Message | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newContent: string) => Promise<void>;
}

const MAX_ROWS_PX = 160;

const MessageInput = ({
  onSendMessage,
  disabled,
  sending,
  conversationId,
  userId,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { startTyping, stopTyping, refreshTyping } = useTypingIndicator(conversationId, userId);

  const isEditing = Boolean(editingMessage);
  const busy = disabled || sending || isSubmitting;
  const canSend = message.trim().length > 0 && !busy;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [message]);

  // Auto-focus input when a conversation is selected or opened
  useEffect(() => {
    setMessage("");
    if (conversationId && !disabled) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [conversationId, disabled]);

  // Auto-focus and populate input when editing starts
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Auto-focus input when a reply is initiated
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const submit = async () => {
    const content = message.trim();
    if (!content || busy) return;

    setIsSubmitting(true);

    try {
      if (isEditing && editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage.id, content);
        setMessage("");
        onCancelEdit?.();
      } else {
        setMessage("");
        await stopTyping();
        await onSendMessage(content, replyingTo);
        onCancelReply?.();
      }
    } catch (error) {
      console.error("Failed to send/edit message:", error);
      setMessage(content);
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      if (isEditing) {
        event.preventDefault();
        setMessage("");
        onCancelEdit?.();
      } else if (replyingTo) {
        event.preventDefault();
        onCancelReply?.();
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setMessage(value);
    if (!isEditing) {
      if (value.trim() && conversationId) startTyping();
      else stopTyping();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? message.length;
      const end = el.selectionEnd ?? message.length;
      const newValue = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newValue);

      // Move cursor after the inserted emoji
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      });

      if (!isEditing && conversationId) startTyping();
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  const replySenderName = replyingTo
    ? replyingTo.sender_id === userId
      ? "yourself"
      : replyingTo.sender?.name?.trim() || "User"
    : "";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border/80 bg-background/95 dark:bg-card/75 p-3 backdrop-blur-md"
    >
      {/* Editing Message Banner */}
      {isEditing && editingMessage && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-foreground backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex min-w-0 items-center gap-2.5 border-l-3 border-amber-500 pl-2.5">
            <Pencil className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold text-amber-500 truncate">
                Editing message
              </p>
              <p className="truncate text-xs text-muted-foreground/90">
                {editingMessage.content}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessage("");
              onCancelEdit?.();
            }}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Cancel editing (Esc)"
            aria-label="Cancel editing"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* WhatsApp-Style Reply Preview Banner */}
      {!isEditing && replyingTo && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/8 px-3.5 py-2 text-xs text-foreground backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex min-w-0 items-center gap-2.5 border-l-3 border-primary pl-2.5">
            <CornerDownRight className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold text-primary truncate">
                Replying to {replySenderName}
              </p>
              <p className="truncate text-xs text-muted-foreground/90">
                {replyingTo.content}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Cancel reply (Esc)"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border-2 px-2.5 py-1.5 transition-all duration-200 shadow-xs",
          isFocused
            ? isEditing
              ? "border-amber-500 bg-background shadow-md shadow-amber-500/10 ring-4 ring-amber-500/15"
              : "border-primary bg-background shadow-md shadow-primary/10 ring-4 ring-primary/15"
            : "border-border/90 bg-background hover:border-primary/50 dark:border-white/20 dark:bg-muted/30",
        )}
      >
        {/* Emoji picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={busy} />

        <textarea
          ref={textareaRef}
          autoFocus={Boolean(conversationId)}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (!isEditing && message.trim() && conversationId) refreshTyping();
          }}
          onBlur={() => {
            setIsFocused(false);
            if (!isEditing) stopTyping();
          }}
          placeholder={
            isEditing
              ? "Edit your message…"
              : replyingTo
                ? `Reply to ${replySenderName}…`
                : "Write a message…"
          }
          aria-label={isEditing ? "Edit message" : "Message"}
          disabled={busy}
          rows={1}
          className={cn(
            "min-h-0 flex-1 resize-none bg-transparent py-2 pr-1 text-base md:text-sm leading-relaxed text-foreground",
            "placeholder:text-muted-foreground/80 dark:placeholder:text-muted-foreground/50",
            "outline-none",
          )}
          style={{ maxHeight: `${MAX_ROWS_PX}px` }}
        />

        <Button
          type="submit"
          size="icon"
          className={cn(
            "mb-0.5 h-9 w-9 shrink-0 rounded-xl transition-all duration-200",
            canSend
              ? isEditing
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 hover:bg-amber-600 hover:scale-105"
                : "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary/90 hover:scale-105"
              : "bg-muted text-muted-foreground/50 dark:bg-white/10 dark:text-muted-foreground/40",
          )}
          disabled={!canSend}
          aria-label={isEditing ? "Save edited message" : "Send message"}
          title={isEditing ? "Save changes (Enter)" : "Send message (Enter)"}
        >
          {sending || isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="mt-2 px-2 text-3xs text-muted-foreground/75">
        <kbd className="rounded border border-border/70 bg-muted/70 px-1.5 py-0.5 font-sans font-medium text-foreground/80 shadow-2xs">Enter</kbd> {isEditing ? "to save" : "to send"} ·{" "}
        <kbd className="rounded border border-border/70 bg-muted/70 px-1.5 py-0.5 font-sans font-medium text-foreground/80 shadow-2xs">Shift + Enter</kbd> for new line
        {(isEditing || replyingTo) && (
          <>
            {" "}· <kbd className="rounded border border-border/70 bg-muted/70 px-1.5 py-0.5 font-sans font-medium text-foreground/80 shadow-2xs">Esc</kbd> to cancel {isEditing ? "editing" : "reply"}
          </>
        )}
      </p>
    </form>
  );
};

export default MessageInput;


