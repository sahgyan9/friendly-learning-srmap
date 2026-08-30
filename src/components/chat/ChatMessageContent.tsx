import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ChatMessageContentProps {
  content: string;
  isOwnMessage?: boolean;
  className?: string;
}

// Regex to capture full URLs (http/https/www)
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  isOwnMessage = false,
  className,
}) => {
  const formattedElements = useMemo(() => {
    if (!content) return null;

    // Split content by lines first to preserve line breaks
    const lines = content.split("\n");

    return lines.map((line, lineIdx) => {
      // Split each line by URLs
      const parts = line.split(URL_REGEX);

      const renderedLine = parts.map((part, partIdx) => {
        if (!part) return null;

        const isUrl = part.match(URL_REGEX);
        if (isUrl) {
          const href = part.startsWith("www.") ? `https://${part}` : part;
          return (
            <a
              key={`link-${lineIdx}-${partIdx}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "underline underline-offset-2 break-all font-medium transition-colors cursor-pointer",
                isOwnMessage
                  ? "text-primary-foreground/95 hover:text-white dark:text-primary-foreground decoration-primary-foreground/60 hover:decoration-white"
                  : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 decoration-blue-500/50 hover:decoration-blue-500"
              )}
            >
              {part}
            </a>
          );
        }

        // Inline formatting for non-URL text: **bold** or *bold* and _italic_
        return parseInlineFormatting(part, `inline-${lineIdx}-${partIdx}`);
      });

      return (
        <React.Fragment key={`line-${lineIdx}`}>
          {renderedLine}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  }, [content, isOwnMessage]);

  return <span className={cn("break-words leading-relaxed", className)}>{formattedElements}</span>;
};

/**
 * Parses bold (**text** or *text*) and italic (_text_) in a text segment.
 */
function parseInlineFormatting(text: string, keyPrefix: string): React.ReactNode {
  // Match bold with **text** or *text*, or italic with _text_
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g);

  if (tokens.length === 1) {
    return text;
  }

  return tokens.map((token, idx) => {
    if (!token) return null;

    // Bold (**text**)
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-bold">
          {token.slice(2, -2)}
        </strong>
      );
    }

    // Bold (*text*) - WhatsApp style
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return (
        <strong key={`${keyPrefix}-b2-${idx}`} className="font-bold">
          {token.slice(1, -1)}
        </strong>
      );
    }

    // Italic (_text_)
    if (token.startsWith("_") && token.endsWith("_") && token.length > 2) {
      return (
        <em key={`${keyPrefix}-i-${idx}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }

    // Inline Code (`code`)
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={`${keyPrefix}-c-${idx}`}
          className="rounded bg-black/15 dark:bg-white/15 px-1 py-0.5 text-[11px] font-mono"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    return token;
  });
}
