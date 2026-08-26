import React from "react";

/**
 * Bold & filled 3-student team silhouette with crisp separation gaps
 * and mathematically mirrored symmetry along the central axis (x=12).
 */
export const GroupsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "h-5 w-5",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Center Member / Leader (x: 7.5 to 16.5) */}
      <circle cx="12" cy="6" r="3.2" />
      <path d="M7.5 21v-4.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5V21h-9z" />

      {/* Left Member (x: 1 to 6.2 — 1.3px separation gap to center) */}
      <circle cx="4.5" cy="8.5" r="2.4" />
      <path d="M1 21v-4.2c0-2 1.6-3.8 3.5-3.8h1.7v8H1z" />

      {/* Right Member (x: 17.8 to 23 — 1.3px separation gap to center, exact 24-x mirror) */}
      <circle cx="19.5" cy="8.5" r="2.4" />
      <path d="M23 21v-4.2c0-2-1.6-3.8-3.5-3.8h-1.7v8H23z" />
    </svg>
  );
};
