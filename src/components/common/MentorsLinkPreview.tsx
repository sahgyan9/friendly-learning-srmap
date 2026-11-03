import { Users } from "lucide-react";
import { LinkPreviewCard } from "@/components/common/LinkPreviewCard";

interface MentorsLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/mentors` link with a preview card for senior student mentors.
 */
export function MentorsLinkPreview({ label }: MentorsLinkPreviewProps) {
  return (
    <LinkPreviewCard
      to="/mentors"
      icon={Users}
      title="Senior student mentors"
      description="Seniors in your department who help with study advice and subject questions."
      action="Find a mentor"
    />
  );
}

export default MentorsLinkPreview;
