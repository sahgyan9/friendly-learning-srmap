import { Trophy } from "lucide-react";
import { LinkPreviewCard } from "@/components/common/LinkPreviewCard";

interface HackathonLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/hackathon-partners` link with a preview card for hackathon team matching.
 */
export function HackathonLinkPreview({ label }: HackathonLinkPreviewProps) {
  return (
    <LinkPreviewCard
      to="/hackathon-partners"
      icon={Trophy}
      title="Hackathon teammates"
      description="Find developers, designers and business students to enter a competition with."
      action="Find teammates"
    />
  );
}

export default HackathonLinkPreview;
