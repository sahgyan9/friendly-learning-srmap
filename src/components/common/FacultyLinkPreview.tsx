import { GraduationCap } from "lucide-react";
import { LinkPreviewCard } from "@/components/common/LinkPreviewCard";

interface FacultyLinkPreviewProps {
  label?: string;
}

/**
 * Replaces a pasted `/faculty` link with a preview card for faculty ratings and reviews.
 */
export function FacultyLinkPreview({ label }: FacultyLinkPreviewProps) {
  return (
    <LinkPreviewCard
      to="/faculty"
      icon={GraduationCap}
      title="Faculty reviews and ratings"
      description="Professor ratings, department reviews and course feedback from SRM AP students."
      action="Browse faculty"
    />
  );
}

export default FacultyLinkPreview;
