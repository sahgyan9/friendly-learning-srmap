import { motion } from "framer-motion";
import { Eye } from "lucide-react";

import AvailabilityBanner from "./AvailabilityBanner";
import MentorProfileSidebar from "./MentorProfileSidebar";
import MentorProfileSections from "./MentorProfileSections";
import { isMentorListed } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";

interface MentorProfileContentProps {
  mentor: Mentor;
  canRate: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
  onMentorUpdated: (mentor: Mentor) => void;
}

const MentorProfileContent = ({
  mentor,
  canRate,
  isOwnProfile,
  ratingLoading,
  onShowRatingModal,
  onMentorUpdated,
}: MentorProfileContentProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, staggerChildren: 0.05 } },
  };

  return (
    <motion.div
      className="mx-auto max-w-6xl"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Says both things at once: the page is yours, and what you are looking
          at is what a student sees. Without it the pencils read as a bug. */}
      {isOwnProfile && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <Eye className="h-4 w-4 flex-shrink-0 text-primary" />
          <span>
            This is your profile, as students see it. Use the{" "}
            <span className="font-medium">pencil icons</span> to edit any section.
          </span>
        </div>
      )}

      {!isMentorListed(mentor) && (
        <AvailabilityBanner
          mentor={mentor}
          isOwnProfile={isOwnProfile}
          onResumed={(patch) => onMentorUpdated({ ...mentor, ...patch })}
        />
      )}

      {/* One column until lg. The sidebar is only sticky where there is a
          second column for it to sit beside. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8">
        <MentorProfileSidebar
          mentor={mentor}
          canRate={canRate}
          ratingLoading={ratingLoading}
          onShowRatingModal={onShowRatingModal}
        />

        <MentorProfileSections
          mentor={mentor}
          canRate={canRate}
          isOwnProfile={isOwnProfile}
          ratingLoading={ratingLoading}
          onShowRatingModal={onShowRatingModal}
          onMentorUpdated={onMentorUpdated}
        />
      </div>
    </motion.div>
  );
};

export default MentorProfileContent;
