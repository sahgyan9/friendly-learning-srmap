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
      viewBox="0 0 512 512"
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
        strokeWidth="28"
      />

      {/* Top binding */}
      <path
        d="M180 82V125"
        strokeWidth="28"
        strokeLinecap="round"
      />
      <path
        d="M332 82V125"
        strokeWidth="28"
        strokeLinecap="round"
      />

      {/* Person head */}
      <circle
        cx="256"
        cy="190"
        r="42"
        fill="currentColor"
        stroke="none"
      />

      {/* Person body */}
      <path
        d="M178 315 C178 264 212 238 256 238 C300 238 334 264 334 315"
        strokeWidth="30"
        strokeLinecap="round"
      />

      {/* Check mark */}
      <circle
        cx="365"
        cy="365"
        r="67"
        strokeWidth="18"
        className="fill-background"
      />

      <path
        d="M330 365 L353 388 L402 337"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AttendanceIcon;
