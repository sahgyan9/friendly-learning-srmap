
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
  isKeyboardOpen?: boolean;
  isMobile?: boolean;
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
  isKeyboardOpen = false,
  isMobile = false,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { startTyping, stopTyping, refreshTyping } = useTypingIndicator(conversationId, userId);

  const isEditing = Boolean(editingMessage);
  const canSend = message.trim().length > 0 && !sending && !isSubmitting && !disabled;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [message]);

  // Auto-focus input only on desktop when a conversation is selected
  useEffect(() => {
    setMessage("");
    if (conversationId && !disabled && !isMobile) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [conversationId, disabled, isMobile]);

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
    if (!content || sending || isSubmitting || disabled) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      if (isEditing && editingMessage && onSaveEdit) {
        await onSaveEdit(editingMessage.id, content);
        onCancelEdit?.();
      } else {
        await stopTyping();
        await onSendMessage(content, replyingTo);
        onCancelReply?.();
      }
    } catch (error) {
      console.error("Failed to send/edit message:", error);
      setMessage(content);
    } finally {
      setIsSubmitting(false);
      if (!isMobile) {
        textareaRef.current?.focus();
      }
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
      className={cn(
        "border-t border-border bg-card p-2.5 sm:p-3",
        isKeyboardOpen
          ? "pb-2 sm:pb-3"
          : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      )}
    >
      {/* Editing Message Banner */}
      {isEditing && editingMessage && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground animate-fade-up">
          <div className="flex min-w-0 items-center gap-2.5 border-l-2 border-primary pl-2.5">
            <Pencil className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold text-primary truncate">
                Editing message
              </p>
              <p className="truncate text-xs text-muted-foreground">
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
        <div className="mb-2 flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground animate-fade-up">
          <div className="flex min-w-0 items-center gap-2.5 border-l-2 border-primary pl-2.5">
            <CornerDownRight className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold text-primary truncate">
                Replying to {replySenderName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
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
          "flex items-end gap-2 rounded-xl border bg-background px-2 py-1.5 transition-colors duration-150",
          isFocused
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-foreground/20",
        )}
      >
        {/* Emoji picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />

        <textarea
          ref={textareaRef}
          autoFocus={!isMobile && Boolean(conversationId)}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (isMobile) {
              if (window.scrollY !== 0) {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
              }
              // Allow visualViewport a frame to settle, then re-lock scroll
              setTimeout(() => {
                if (window.scrollY !== 0) {
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
                }
              }, 60);
            }
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
          disabled={disabled}
          rows={1}
          className={cn(
            "min-h-0 flex-1 resize-none bg-transparent py-2 pr-1 text-base md:text-sm leading-relaxed text-foreground",
            "placeholder:text-muted-foreground",
            "outline-none",
          )}
          style={{ maxHeight: `${MAX_ROWS_PX}px` }}
        />

        <Button
          type="submit"
          size="icon"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "mb-0.5 h-9 w-9 shrink-0 rounded-lg",
            !canSend && "bg-muted text-muted-foreground",
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

      <p className="mt-2 px-2 text-3xs text-muted-foreground hidden sm:block">
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans font-medium text-foreground">Enter</kbd> {isEditing ? "to save" : "to send"} ·{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans font-medium text-foreground">Shift + Enter</kbd> for new line
        {(isEditing || replyingTo) && (
          <>
            {" "}· <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans font-medium text-foreground">Esc</kbd> to cancel {isEditing ? "editing" : "reply"}
          </>
        )}
      </p>
    </form>
  );
};

export default MessageInput;


