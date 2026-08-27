import type { SVGProps } from "react";

/**
 * Custom monochrome attendance register icon.
 * Vector artwork depicting an attendance register sheet with binding clips,
 * student avatar, and a verification checkmark.
 * Uses `currentColor` so it adapts cleanly across light/dark themes and active states.
 */
export const AttendanceIcon = ({
  className = "h-4 w-4",
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="105 60 345 385"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Attendance sheet */}
      <rect
        x="125"
        y="82"
        width="262"
        height="348"
        rx="38"
        strokeWidth="32"
      />

      {/* Top binding clips */}
      <path
        d="M180 64V120"
        strokeWidth="32"
        strokeLinecap="round"
      />
      <path
        d="M332 64V120"
        strokeWidth="32"
        strokeLinecap="round"
      />

      {/* Person head */}
      <circle
        cx="256"
        cy="190"
        r="44"
        fill="currentColor"
        stroke="none"
      />

      {/* Person body */}
      <path
        d="M178 315 C178 260 212 234 256 234 C300 234 334 260 334 315"
        strokeWidth="34"
        strokeLinecap="round"
      />

      {/* Check mark badge */}
      <circle
        cx="365"
        cy="365"
        r="67"
        strokeWidth="24"
        className="fill-background"
      />

      {/* Check mark tick */}
      <path
        d="M328 365 L353 390 L402 337"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AttendanceIcon;
