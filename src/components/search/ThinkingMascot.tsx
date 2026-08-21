import React from "react";
import { cn } from "@/lib/utils";

/**
 * Draft mascot mark for a future CampusThinkingStatus redesign — not wired
 * into any live component yet. Single bounce animation (translateY + squash
 * scale), eyes cut out with the theme background color rather than a second
 * layer. Pairs with a flat-colored status line (no gradient) and an
 * elapsed-seconds readout when it's reintroduced.
 *
 * Open threads to revisit before shipping:
 * - Bounce timing/easing could use another pass once seen next to real
 *   phrase-cycling text.
 * - Eye fill uses hsl(var(--background)) rather than var(--background, #fff)
 *   — this app stores --background as a bare HSL triplet, so the var()
 *   fallback form silently computes to `fill: none`. Keep using
 *   hsl(var(--background)) here and anywhere else this pattern shows up
 *   (CampusMindIcon.tsx has the same latent bug on its satellite-node
 *   sparks).
 */
export const ThinkingMascot: React.FC<{ className?: string; animate?: boolean }> = ({
  className,
  animate = true,
}) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("shrink-0 inline-block select-none", className)}
  >
    <defs>
      <style>{`
        @keyframes ctm-bounce {
          0%, 100% { transform: translateY(0) scaleX(1) scaleY(1); }
          50% { transform: translateY(-3px) scaleX(1.06) scaleY(0.9); }
        }
        .ctm-anim-bounce {
          transform-origin: 12px 18.5px;
          animation: ctm-bounce 0.9s ease-in-out infinite;
        }
      `}</style>
    </defs>
    <g className={animate ? "ctm-anim-bounce" : undefined}>
      <rect x="5" y="5.5" width="14" height="13" rx="5" fill="currentColor" />
      <circle cx="9.3" cy="12" r="1.3" fill="hsl(var(--background))" />
      <circle cx="14.7" cy="12" r="1.3" fill="hsl(var(--background))" />
    </g>
  </svg>
);
