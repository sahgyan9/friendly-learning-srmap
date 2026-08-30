import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { cn } from "@/lib/utils";

const DEFAULT_THINKING_PHRASES = [
  "Thinking…",
  "Crystallizing insights…",
  "Synthesizing campus knowledge…",
  "Connecting faculty & mentors…",
  "Analyzing courses & skills…",
  "Picturing possibilities…",
  "Structuring recommendations…",
  "Mapping peer discussions…",
  "Refining overview…",
];

interface CampusThinkingStatusProps {
  className?: string;
  phrases?: string[];
  layout?: "horizontal" | "vertical";
  iconSize?: string;
  textSize?: string;
  intervalMs?: number;
}

/**
 * Animated dynamic AI reasoning indicator.
 * Displays the fast-calculating CampusBrain neural icon alongside smoothly
 * rotating thinking phrases with a glistening white/silver shimmer text animation.
 */
export const CampusThinkingStatus: React.FC<CampusThinkingStatusProps> = ({
  className,
  phrases = DEFAULT_THINKING_PHRASES,
  layout = "vertical",
  iconSize = "h-7 w-7",
  textSize = "text-xs",
  intervalMs = 1800,
}) => {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || phrases.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [phrases.length, intervalMs, reduceMotion]);

  const currentText = phrases[index % phrases.length];

  return (
    <div
      className={cn(
        "flex items-center justify-center select-none",
        layout === "vertical" ? "flex-col gap-3 py-6" : "flex-row gap-2.5 py-1",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {/* Dynamic Animated Icon with soft ambient aura */}
      <div className="relative flex items-center justify-center shrink-0">
        <div className="absolute -inset-2 rounded-full bg-violet-500/20 dark:bg-violet-400/25 blur-md animate-pulse" />
        <CampusBrainIcon speed="fast" className={cn("relative text-violet-600 dark:text-violet-400", iconSize)} />
      </div>

      {/* Rotating Shimmer Text */}
      <div className={cn("relative min-h-[1.25rem] flex items-center justify-center overflow-hidden", layout === "vertical" ? "text-center" : "text-left")}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={currentText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={cn(
              "font-medium tracking-wide",
              textSize,
              "bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-600 dark:from-violet-300 dark:via-white dark:to-purple-200 bg-clip-text text-transparent",
              "animate-pulse drop-shadow-2xs",
            )}
          >
            {currentText}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};
