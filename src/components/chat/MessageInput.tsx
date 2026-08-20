
import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import EmojiPicker from "./EmojiPicker";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled: boolean;
  sending: boolean;
  conversationId: string | null;
  userId: string;
}

const MAX_ROWS_PX = 160;

const MessageInput = ({
  onSendMessage,
  disabled,
  sending,
  conversationId,
  userId
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { startTyping, stopTyping, refreshTyping } = useTypingIndicator(conversationId, userId);

  const busy = disabled || sending || isSubmitting;
  const canSend = message.trim().length > 0 && !busy;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [message]);

  useEffect(() => {
    setMessage("");
  }, [conversationId]);

  const submit = async () => {
    const content = message.trim();
    if (!content || busy) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      await stopTyping();
      await onSendMessage(content);
    } catch (error) {
      console.error("Failed to send message:", error);
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
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setMessage(value);
    if (value.trim() && conversationId) startTyping();
    else stopTyping();
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

      if (conversationId) startTyping();
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/8 bg-card/60 p-3 backdrop-blur-md"
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border px-1.5 py-1.5 transition-all duration-200",
          isFocused
            ? "border-primary/40 bg-background/80 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
            : "border-white/10 bg-white/5",
        )}
      >
        {/* Emoji picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={busy} />

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (message.trim() && conversationId) refreshTyping();
          }}
          onBlur={() => {
            setIsFocused(false);
            stopTyping();
          }}
          placeholder="Write a message…"
          aria-label="Message"
          disabled={busy}
          rows={1}
          className={cn(
            "min-h-0 flex-1 resize-none bg-transparent py-2 pr-1 text-sm leading-relaxed text-foreground",
            "placeholder:text-muted-foreground/40",
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
              ? "bg-gradient-to-br from-primary to-primary/80 shadow-md shadow-primary/30 hover:shadow-primary/50 hover:scale-105"
              : "opacity-40",
          )}
          disabled={!canSend}
          aria-label="Send message"
        >
          {sending || isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="mt-1.5 px-2 text-3xs text-muted-foreground/40">
        <kbd className="font-sans">Enter</kbd> to send ·{" "}
        <kbd className="font-sans">Shift + Enter</kbd> for new line
      </p>
    </form>
  );
};

export default MessageInput;
