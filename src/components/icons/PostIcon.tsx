import React from "react";

/**
 * Traced from public/lovable-uploads/Posts.svg — layered post cards with text lines,
 * using `stroke="currentColor"` so it recolors with the accent and switches for light/dark
 * like every other nav icon.
 */
export const PostIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
      {/* Back Card */}
      <rect x="7" y="5" width="11" height="13" rx="2" />

      {/* Front Card */}
      <rect x="4" y="8" width="11" height="13" rx="2" />

      {/* Text Lines */}
      <line x1="7" y1="12" x2="12" y2="12" />
      <line x1="7" y1="15" x2="10" y2="15" />
    </svg>
  );
};
