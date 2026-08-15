import React from "react";
import { cn } from "@/lib/utils";

interface CampusMindIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  animate?: boolean;
}

/**
 * Animated CampusMind Neural Orbit / Synapse Icon.
 *
 * Features:
 * - Continuous smooth 360° circular rotation of the orbital arcs.
 * - Organic in-and-out breathing & pulse of the neural connection beams and satellite nodes.
 * - Rhythmic core intelligence heartbeat pulse.
 */
export const CampusMindIcon: React.FC<CampusMindIconProps> = ({
  className = "h-5 w-5",
  animate = true,
  ...props
}) => {
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
              transform: scale(0.82);
              opacity: 0.75;
            }
            50% {
              transform: scale(1.14);
              opacity: 1;
            }
          }
          @keyframes cm-core-pulse {
            0%, 100% {
              transform: scale(0.88);
              filter: drop-shadow(0 0 1px currentColor);
            }
            50% {
              transform: scale(1.16);
              filter: drop-shadow(0 0 4px currentColor);
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
          .cm-anim-spin {
            transform-origin: 12px 12px;
            animation: cm-spin-clockwise 9s linear infinite;
          }
          .cm-anim-spin-reverse {
            transform-origin: 12px 12px;
            animation: cm-spin-counter 14s linear infinite;
          }
          .cm-anim-synapse {
            transform-origin: 12px 12px;
            animation: cm-synapse-inout 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          }
          .cm-anim-core {
            transform-origin: 12px 12px;
            animation: cm-core-pulse 2.8s ease-in-out infinite;
          }
          .cm-anim-beam {
            stroke-dasharray: 4 2;
            animation: cm-beam-flow 1.8s linear infinite;
          }
        `}</style>
      </defs>

      {/* ── Outer Rotating Orbital Arcs ── */}
      <g className={animate ? "cm-anim-spin" : undefined}>
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
        {/* Subtle decorative orbit dot */}
        <circle cx="21.5" cy="12" r="1" fill="currentColor" />
        <circle cx="2.5" cy="12" r="1" fill="currentColor" />
      </g>

      {/* ── Counter-rotating dashed guide ring ── */}
      <g className={animate ? "cm-anim-spin-reverse" : undefined}>
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
      <g className={animate ? "cm-anim-synapse" : undefined}>
        {/* Ray 1 (Top) */}
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="4.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={animate ? "cm-anim-beam" : undefined}
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
          className={animate ? "cm-anim-beam" : undefined}
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
          className={animate ? "cm-anim-beam" : undefined}
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
      <g className={animate ? "cm-anim-core" : undefined}>
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
