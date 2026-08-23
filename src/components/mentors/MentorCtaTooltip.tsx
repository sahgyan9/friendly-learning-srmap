import { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Shared between the homepage CTA and the navbar profile menu so the pitch
 * reads identically wherever someone meets it.
 */
const MENTOR_CTA_POINTS = [
  "Help others discover you by your skills and interests",
  "Earn a certificate and badges for helping students",
  "Get discoverable in the CampusMind AI search",
  "Build a public track record of helping others",
];

interface MentorCtaTooltipProps {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function MentorCtaTooltip({ children, side = "top" }: MentorCtaTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px]">
        <ul className="list-disc space-y-1 pl-4 text-left">
          {MENTOR_CTA_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
