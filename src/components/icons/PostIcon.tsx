import React from "react";

/**
 * Traced from public/lovable-uploads/posts2.svg — layered post card with top tab,
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
      <rect x="5" y="5" width="12" height="14" rx="2" />
      <path d="M9 5v-1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10" />
      <line x1="8" y1="10" x2="14" y2="10" />
      <line x1="8" y1="13" x2="12" y2="13" />
    </svg>
  );
};
