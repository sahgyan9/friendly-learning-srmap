import React from "react";
import { cn } from "@/lib/utils";

interface CampusBrainIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  animate?: boolean;
  speed?: "normal" | "fast";
}

/**
 * Animated CampusBrain Neural Orbit / Synapse Icon.
 *
 * Features:
 * - Ambient relaxed state by default (`speed="normal"`: 8s orbit, 2.6s gentle breath).
 * - High-speed rigorous calculation state (`speed="fast"`: 2.0s rapid orbit, 0.85s snappy firing) when processing search queries or generating AI overviews.
 */
export const CampusBrainIcon: React.FC<CampusBrainIconProps> = ({
  className = "h-5 w-5",
  animate = true,
  speed = "normal",
  ...props
}) => {
  const isFast = speed === "fast";

  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5 shrink-0 inline-block select-none", className)}
      {...props}
    >
      <defs>
        <style>{`
          @keyframes cm-spin-clockwise {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes cm-spin-counter {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes cm-synapse-inout {
            0%, 100% {
              transform: scale(0.78);
              opacity: 0.7;
            }
            50% {
              transform: scale(1.18);
              opacity: 1;
            }
          }
          @keyframes cm-core-pulse {
            0%, 100% {
              transform: scale(0.85);
              filter: drop-shadow(0 0 1px currentColor);
            }
            50% {
              transform: scale(1.22);
              filter: drop-shadow(0 0 5px currentColor);
            }
          }
          @keyframes cm-beam-flow {
            0% {
              stroke-dashoffset: 16;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
          .cm-anim-spin-fast {
            transform-origin: 12px 12px;
            animation: cm-spin-clockwise 2.0s linear infinite;
          }
          .cm-anim-spin-normal {
            transform-origin: 12px 12px;
            animation: cm-spin-clockwise 8.0s linear infinite;
          }
          .cm-anim-spin-reverse-fast {
            transform-origin: 12px 12px;
            animation: cm-spin-counter 3.2s linear infinite;
          }
          .cm-anim-spin-reverse-normal {
            transform-origin: 12px 12px;
            animation: cm-spin-counter 12.0s linear infinite;
          }
          .cm-anim-synapse-fast {
            transform-origin: 12px 12px;
            animation: cm-synapse-inout 0.85s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .cm-anim-synapse-normal {
            transform-origin: 12px 12px;
            animation: cm-synapse-inout 2.6s ease-in-out infinite;
          }
          .cm-anim-core-fast {
            transform-origin: 12px 12px;
            animation: cm-core-pulse 0.85s ease-in-out infinite;
          }
          .cm-anim-core-normal {
            transform-origin: 12px 12px;
            animation: cm-core-pulse 2.6s ease-in-out infinite;
          }
          .cm-anim-beam-fast {
            stroke-dasharray: 4 2;
            animation: cm-beam-flow 0.5s linear infinite;
          }
          .cm-anim-beam-normal {
            stroke-dasharray: 4 2;
            animation: cm-beam-flow 1.8s linear infinite;
          }
        `}</style>
      </defs>

      {/* ── Outer Rotating Orbital Arcs ── */}
      <g className={animate ? (isFast ? "cm-anim-spin-fast" : "cm-anim-spin-normal") : undefined}>
        {/* Arc 1 */}
        <path
          d="M 12 2.5 A 9.5 9.5 0 0 1 21.5 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Arc 2 */}
        <path
          d="M 12 21.5 A 9.5 9.5 0 0 1 2.5 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Subtle decorative orbit dots */}
        <circle cx="21.5" cy="12" r="1" fill="currentColor" />
        <circle cx="2.5" cy="12" r="1" fill="currentColor" />
      </g>

      {/* ── Counter-rotating dashed guide ring ── */}
      <g className={animate ? (isFast ? "cm-anim-spin-reverse-fast" : "cm-anim-spin-reverse-normal") : undefined}>
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 6"
          strokeOpacity="0.3"
        />
      </g>

      {/* ── Expanding & Contracting Neural Synapses (In-Out Movement) ── */}
      <g className={animate ? (isFast ? "cm-anim-synapse-fast" : "cm-anim-synapse-normal") : undefined}>
        {/* Ray 1 (Top) */}
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="4.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={animate ? (isFast ? "cm-anim-beam-fast" : "cm-anim-beam-normal") : undefined}
        />
        {/* Ray 2 (Bottom Right) */}
        <line
          x1="12"
          y1="12"
          x2="18.7"
          y2="15.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={animate ? (isFast ? "cm-anim-beam-fast" : "cm-anim-beam-normal") : undefined}
        />
        {/* Ray 3 (Bottom Left) */}
        <line
          x1="12"
          y1="12"
          x2="5.3"
          y2="15.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={animate ? (isFast ? "cm-anim-beam-fast" : "cm-anim-beam-normal") : undefined}
        />

        {/* Satellite Node 1 (Top) */}
        <circle cx="12" cy="4.2" r="2" fill="currentColor" />
        <circle cx="12" cy="4.2" r="0.9" fill="var(--background, #fff)" fillOpacity="0.9" />

        {/* Satellite Node 2 (Bottom Right) */}
        <circle cx="18.7" cy="15.8" r="2" fill="currentColor" />
        <circle cx="18.7" cy="15.8" r="0.9" fill="var(--background, #fff)" fillOpacity="0.9" />

        {/* Satellite Node 3 (Bottom Left) */}
        <circle cx="5.3" cy="15.8" r="2" fill="currentColor" />
        <circle cx="5.3" cy="15.8" r="0.9" fill="var(--background, #fff)" fillOpacity="0.9" />
      </g>

      {/* ── Central Intelligence Nucleus (Pulsing Heartbeat) ── */}
      <g className={animate ? (isFast ? "cm-anim-core-fast" : "cm-anim-core-normal") : undefined}>
        {/* Soft aura */}
        <circle cx="12" cy="12" r="3.6" fill="currentColor" fillOpacity="0.25" />
        {/* Solid core */}
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        {/* Specular inner spark */}
        <circle cx="11.2" cy="11.2" r="0.75" fill="var(--background, #fff)" fillOpacity="0.85" />
      </g>
    </svg>
  );
};
