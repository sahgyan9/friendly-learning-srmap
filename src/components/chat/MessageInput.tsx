
import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { startTyping, stopTyping, refreshTyping } = useTypingIndicator(conversationId, userId);

  const busy = disabled || sending || isSubmitting;
  const canSend = message.trim().length > 0 && !busy;

  // Grow with the content up to a ceiling, then scroll. A fixed-height box
  // hides the top of anything longer than two lines while you write it.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [message]);

  // Switching conversations should not carry a half-written message across.
  useEffect(() => {
    setMessage("");
  }, [conversationId]);

  const submit = async () => {
    const content = message.trim();
    if (!content || busy) return;

    setIsSubmitting(true);
    // Clear immediately: the send is optimistic upstream, and leaving the text
    // sitting there makes it look like nothing happened.
    setMessage("");

    try {
      await stopTyping();
      await onSendMessage(content);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(content); // hand it back rather than losing what was typed
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

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-3">
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-muted/40 p-1.5 transition-colors",
          "focus-within:border-primary focus-within:bg-background",
        )}
      >
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => message.trim() && conversationId && refreshTyping()}
          onBlur={stopTyping}
          placeholder="Write a message…"
          aria-label="Message"
          disabled={busy}
          rows={1}
          className={cn(
            "min-h-0 resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
          )}
        />

        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl"
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

      <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
        <kbd className="rounded border bg-muted px-1 font-sans">Enter</kbd> to send ·{" "}
        <kbd className="rounded border bg-muted px-1 font-sans">Shift</kbd>+
        <kbd className="rounded border bg-muted px-1 font-sans">Enter</kbd> for a new line
      </p>
    </form>
  );
};

export default MessageInput;
