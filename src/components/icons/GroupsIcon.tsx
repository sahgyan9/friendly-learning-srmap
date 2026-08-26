import React from "react";

/**
 * Bold & filled 3-student team composition (center leader with left & right members),
 * matching the solid silhouette visual weight of Mentors, Faculty, and Events icons in the navbar.
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
      {/* Center Member / Leader */}
      <circle cx="12" cy="6" r="3.2" />
      <path d="M12 11c-2.8 0-5 1.8-5 4.2V21h10v-5.8c0-2.4-2.2-4.2-5-4.2z" />

      {/* Left Member */}
      <circle cx="4.5" cy="8.5" r="2.4" />
      <path d="M4.5 12.5c-2 0-3.5 1.3-3.5 3V21h4.2v-3.5c0-.9.3-1.7.8-2.4-.5-.4-1-.6-1.5-.6z" />

      {/* Right Member */}
      <circle cx="19.5" cy="8.5" r="2.4" />
      <path d="M19.5 12.5c-.5 0-1 .2-1.5.6.5.7.8 1.5.8 2.4V21h4.2v-5.5c0-1.7-1.5-3-3.5-3z" />
    </svg>
  );
};
