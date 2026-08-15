import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CampusMindIcon } from "@/components/icons/CampusMindIcon";

import {
  EXAMPLE_QUESTIONS,
  EXAMPLE_ROTATION_MS,
  SEARCH_BRAND,
  SEARCH_TAGLINE,
} from "@/lib/search/brand";
import { OPEN_SEARCH_EVENT } from "@/lib/search/events";
import { cn } from "@/lib/utils";

/**
 * The hero's front door to search.
 *
 * The header trigger was the only way in, and on a landing page it loses: it is
 * a small grey control sitting in a row of chrome, below a gradient headline
 * and beside a filled Sign up button. Nothing about it says the box can answer
 * a question, so nobody asked it one.
 *
 * This is the same dialog, opened from where the eye already is. It is a
 * button, not an input, on purpose — a real field here would need its own
 * results surface, and duplicating the result list in two places is how the two
 * drift apart. Clicking hands off to the one dialog that already does the work.
 *
 * The rotating question is the point of the component. "Ask anything" tells you
 * what the box accepts; a question you recognise as your own tells you it is
 * worth opening.
 */
const AskBox = ({ className }: { className?: string }) => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);

  // The homepage is pre-rendered, so this reads the user agent on the client
  // only. Index starts at 0 on both sides for the same reason — a random first
  // question would mismatch the served HTML on hydration.
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % EXAMPLE_QUESTIONS.length),
      EXAMPLE_ROTATION_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion]);

  const open = () => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));

  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)}>
      <div className="group relative">
        {/* The glow. Sits behind the card and brightens on hover, which is what
            makes the whole block read as one pressable object rather than as a
            bordered box with a shadow. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-[1.25rem] bg-gradient-to-r from-[#3963C6] via-violet-500 to-emerald-500 opacity-35 blur-lg transition-opacity duration-500 group-hover:opacity-60 motion-reduce:transition-none"
        />

        {/* A 1px gradient ring, drawn as a padded gradient behind an opaque
            inner surface. `border-image` cannot do a rounded gradient border
            without clipping the corners. */}
        <div className="relative rounded-2xl bg-gradient-to-r from-[#3963C6] via-violet-500 to-emerald-500 p-px">
          <button
            type="button"
            onClick={open}
            aria-label={`Open ${SEARCH_BRAND} search`}
            className="flex w-full items-center gap-3 rounded-[calc(1rem-1px)] bg-background px-4 py-3.5 text-left transition-colors duration-300 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 sm:px-5 sm:py-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3963C6] to-violet-500 text-white shadow-md shadow-violet-500/25">
              <CampusMindIcon className="h-5 w-5" aria-hidden />
            </span>

            {/* Fixed height and clipped: the questions differ in length, and
                letting the row resize between them would nudge the CTAs below
                on every rotation. */}
            <span className="relative h-6 min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={EXAMPLE_QUESTIONS[index]}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex items-center truncate text-sm text-muted-foreground sm:text-base"
                >
                  {EXAMPLE_QUESTIONS[index]}
                </motion.span>
              </AnimatePresence>
            </span>

            {/* AI Mode badge on landing page */}
            <span className="shrink-0 flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-300 shadow-xs">
              <CampusMindIcon className="h-3.5 w-3.5 text-violet-500" />
              <span>AI Mode</span>
            </span>

            <kbd className="ml-1 hidden shrink-0 items-center gap-0.5 rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
              {isMac ? "⌘" : "Ctrl"} D
            </kbd>
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/80">
          {SEARCH_BRAND}
          <sup className="ml-0.5 text-[8px] font-medium">™</sup>
        </span>{" "}
        — {SEARCH_TAGLINE}.{" "}
        {/* Three lines of caption under the box on a phone is more explaining
            than the box needs. The tagline alone still carries the claim; the
            sentence that unpacks it is for the wider screens that have room. */}
        <span className="hidden sm:inline">
          Ask in your own words; it finds the people, groups and threads that
          match.
        </span>
      </p>
    </div>
  );
};

export default AskBox;
