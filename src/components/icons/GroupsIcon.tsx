import React from "react";

/**
 * Traced from public/lovable-uploads/groups2.svg — network graph of 3 connected people,
 * using `stroke="currentColor"` so it recolors with the accent and switches for light/dark
 * like every other nav icon.
 */
export const GroupsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "h-5 w-5",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Heads */}
      <circle cx="12" cy="5" r="2" />
      <circle cx="6" cy="16" r="2" />
      <circle cx="18" cy="16" r="2" />

      {/* Connections */}
      <path d="M10.7 6.7L7.3 14" />
      <path d="M13.3 6.7L16.7 14" />
      <path d="M8 16h8" />

      {/* Bodies */}
      <path d="M12 9v2" />
      <path d="M6 18v1" />
      <path d="M18 18v1" />
    </svg>
  );
};
