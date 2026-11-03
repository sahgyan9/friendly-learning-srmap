import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Each phrase names a step the pipeline actually performs, so the line reads
// as progress rather than personality.
const DEFAULT_THINKING_PHRASES = [
  "Searching campus records",
  "Reading mentor and faculty profiles",
  "Checking posts and documents",
  "Writing the answer",
];

interface CampusThinkingStatusProps {
  className?: string;
  phrases?: string[];
  layout?: "horizontal" | "vertical";
  /** Kept for call-site compatibility; the spinner is always 16px. */
  iconSize?: string;
  textSize?: string;
  intervalMs?: number;
}

/**
 * Loading status line for CampusBrain answers: a spinner and the step in
 * progress. The step advances while the request runs and stops on the last
 * phrase instead of looping, so a slow answer does not look like it started
 * over.
 */
export const CampusThinkingStatus: React.FC<CampusThinkingStatusProps> = ({
  className,
  phrases = DEFAULT_THINKING_PHRASES,
  layout = "horizontal",
  textSize = "text-sm",
  intervalMs = 1800,
}) => {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || phrases.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, phrases.length - 1));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [phrases.length, intervalMs, reduceMotion]);

  const currentText = phrases[Math.min(index, phrases.length - 1)];

  return (
    <div
      className={cn(
        "flex select-none items-center text-muted-foreground",
        layout === "vertical" ? "flex-col justify-center gap-2 py-6 text-center" : "flex-row gap-2",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      <span className={cn("font-medium", textSize)}>{currentText}&hellip;</span>
    </div>
  );
};
