import React from "react";

/**
 * Traced from public/lovable-uploads/postcard.svg — same artwork, same
 * path data, using `fill="currentColor"` in place of hardcoded black so it
 * recolors with the accent and switches for light/dark like every other nav
 * icon.
 */
export const PostIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = "h-5 w-5",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      {...props}
    >
      <g>
        <g>
          <path d="M135.837,135.837v240.327h240.327V135.837H135.837z M344.816,344.816H167.184V167.184h177.633V344.816z" />
        </g>
      </g>
      <g>
        <g>
          <rect x="135.837" y="412.735" width="240.327" height="31.347" />
        </g>
      </g>
      <g>
        <g>
          <path d="M386.612,73.143V0h-18.725L73.143,76.699V512h365.714V73.143H386.612z M355.265,35.676v37.467H211.284L355.265,35.676z M407.51,480.653H104.49V104.49h303.02V480.653z" />
        </g>
      </g>
    </svg>
  );
};
