import React from "react";

/**
 * Traced from public/lovable-uploads/groups3.svg — 3 people group arrangement,
 * with tuned viewBox ("1.5 4 21 15.5") and strokeWidth="2.2" so it matches the exact
 * visual scale, height, and line weight of the surrounding navbar icons.
 */
export const GroupsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "h-5 w-5",
  ...props
}) => {
  return (
    <svg
      viewBox="1.5 4 21 15.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Center person */}
      <circle cx="12" cy="7" r="2.2" />
      <path d="M9.5 12c0-1.7 1.3-3 2.5-3s2.5 1.3 2.5 3" />

      {/* Left person */}
      <circle cx="5.5" cy="13" r="1.8" />
      <path d="M3.5 17c0-1.3 1-2.3 2-2.3s2 1 2 2.3" />

      {/* Right person */}
      <circle cx="18.5" cy="13" r="1.8" />
      <path d="M16.5 17c0-1.3 1-2.3 2-2.3s2 1 2 2.3" />
    </svg>
  );
};
