
import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  disabled: boolean;
  sending: boolean;
  conversationId: string | null;
  userId: string;
}

const MessageInput = ({ 
  onSendMessage, 
  disabled, 
  sending, 
  conversationId, 
  userId 
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { startTyping, stopTyping, refreshTyping } = useTypingIndicator(conversationId, userId);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || sending || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await stopTyping(); // Stop typing before sending
      await onSendMessage(message.trim());
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Handle typing indicators
    if (value.trim() && conversationId) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleInputFocus = () => {
    if (message.trim() && conversationId) {
      refreshTyping();
    }
  };
  
  return (
    <div className="p-4 border-t border-border bg-background">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={stopTyping}
            placeholder="Type your message..."
            className="min-h-[44px] max-h-32 resize-none border-muted-foreground/20 focus:border-primary rounded-xl px-4 py-3"
            disabled={disabled || sending || isSubmitting}
            rows={1}
          />
        </div>
        <Button 
          type="submit" 
          size="sm"
          className="h-11 w-11 rounded-xl"
          disabled={disabled || sending || isSubmitting || !message.trim()}
        >
          {sending || isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default MessageInput;
