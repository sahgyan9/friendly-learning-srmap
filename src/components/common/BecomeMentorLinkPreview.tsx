import { Award } from "lucide-react";
import { LinkPreviewCard } from "@/components/common/LinkPreviewCard";

interface BecomeMentorLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/become-mentor` link with a preview card for the mentor sign-up.
 */
export function BecomeMentorLinkPreview({ label }: BecomeMentorLinkPreviewProps) {
  return (
    <LinkPreviewCard
      to="/become-mentor"
      icon={Award}
      title="Become a mentor"
      description="Guide freshers in your courses and earn a Certificate of Mentorship."
      action="Apply to mentor"
    />
  );
}

export default BecomeMentorLinkPreview;
