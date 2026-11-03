import { Calendar } from "lucide-react";
import { LinkPreviewCard } from "@/components/common/LinkPreviewCard";

interface MarketplaceLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/marketplace` link with a preview card for campus events and workshops.
 */
export function MarketplaceLinkPreview({ label }: MarketplaceLinkPreviewProps) {
  return (
    <LinkPreviewCard
      to="/events"
      icon={Calendar}
      title="Campus events and workshops"
      description="Upcoming university events, club activities, workshops and hackathons at SRM AP."
      action="View events"
    />
  );
}

export default MarketplaceLinkPreview;
