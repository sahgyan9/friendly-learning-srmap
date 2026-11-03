import React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared frame for the hand-drawn section icons, so they match Lucide's
 * grid (24px, 2px stroke, round caps) and sit beside Lucide glyphs in the
 * same nav without one looking heavier than the other. The earlier versions
 * were filled clip-art traced from PNGs at three different viewBoxes, which
 * is why the rail looked like it had been assembled from different sets.
 */
export const StrokeIcon = ({
  className,
  children,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("h-5 w-5 shrink-0", className)}
    {...props}
  >
    {children}
  </svg>
);
