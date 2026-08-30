import { motion } from "framer-motion";
import { Eye, Award } from "lucide-react";
import AvailabilityBanner from "./AvailabilityBanner";
import MentorHeroHeader from "./MentorHeroHeader";
import SmartMatchBanner from "./SmartMatchBanner";
import MentorOutcomesSection from "./MentorOutcomesSection";
import IdealMenteeSection from "./IdealMenteeSection";
import ProfileSummaryNote from "./ProfileSummaryNote";
import CategorizedSkillsDisplay from "./CategorizedSkillsDisplay";
import MentorCoursesSection from "./MentorCoursesSection";
import MentorExperienceSection from "./MentorExperienceSection";
import MentorProjectsSection from "./MentorProjectsSection";
import MentorReviewHighlights from "./MentorReviewHighlights";
import SimilarMentorsSection from "./SimilarMentorsSection";
import BadgeDisplay from "@/components/badges/BadgeDisplay";
import { isMentorListed } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { getEnhancedMentorProfile } from "@/utils/mentor-enhancements";

import ProfileCompletenessBanner from "./ProfileCompletenessBanner";
import MentorClubsSection from "./MentorClubsSection";

interface MentorProfileContentProps {
  mentor: Mentor;
  canRate: boolean;
  hasRated?: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
  onMentorUpdated: (mentor: Mentor) => void;
}

const MentorProfileContent = ({
  mentor: rawMentor,
  canRate,
  hasRated = false,
  isOwnProfile,
  ratingLoading,
  onShowRatingModal,
  onMentorUpdated,
}: MentorProfileContentProps) => {
  const mentor = getEnhancedMentorProfile(rawMentor);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, staggerChildren: 0.05 } },
  };

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-8 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1-Click Profile Kickstart / Completeness Banner for owner */}
      {isOwnProfile && (
        <ProfileCompletenessBanner
          mentor={mentor}
          onMentorUpdated={onMentorUpdated}
        />
      )}

      {/* Unlisted / Paused Availability Banner */}
      {!isMentorListed(mentor) && (
        <AvailabilityBanner
          mentor={mentor as any}
          isOwnProfile={isOwnProfile}
          onResumed={(patch) => onMentorUpdated({ ...rawMentor, ...patch })}
        />
      )}

      {/* SECTION 1: WHO I AM (Hero Header Card with Photo, Tagline, Trust Stats & Connect CTA) */}
      <MentorHeroHeader
        mentor={mentor as any}
        canRate={canRate}
        hasRated={hasRated}
        ratingLoading={ratingLoading}
        onShowRatingModal={onShowRatingModal}
        onMentorUpdated={onMentorUpdated}
      />

      {/* SECTION 2: SMART MATCH BANNER */}
      <SmartMatchBanner mentor={mentor} isOwnProfile={isOwnProfile} onMentorUpdated={onMentorUpdated} />

      {/* SECTION 3: HOW I CAN HELP YOU */}
      <MentorOutcomesSection
        mentor={mentor}
        isOwnProfile={isOwnProfile}
        onMentorUpdated={onMentorUpdated}
      />

      {/* SECTION 4: IDEAL MENTEES ("Perfect if you are...") */}
      <IdealMenteeSection
        mentor={mentor}
        isOwnProfile={isOwnProfile}
        onMentorUpdated={onMentorUpdated}
      />

      {/* Discloses that sections 3 and 4 were summarised rather than written by
          the mentor, or — on their own profile — explains why they are absent.
          Renders nothing for a visitor looking at a sparse profile. */}
      <ProfileSummaryNote mentor={mentor} isOwnProfile={isOwnProfile} />

      {/* SECTION 5: CATEGORIZED SKILLS */}
      <CategorizedSkillsDisplay mentor={mentor} />

      {/* SECTION 5b: COURSES TAKEN (opt-in) */}
      <MentorCoursesSection mentor={mentor} />

      {/* SECTION 5c: CLUBS & STUDENT CHAPTERS */}
      <MentorClubsSection userId={mentor.id} isOwnProfile={isOwnProfile} />

      {/* No availability/schedule card. It displayed "Active Days: Mon Wed Fri"
          and "Preferred Time Slot: Evening (6 PM - 10 PM)" for every mentor from
          hardcoded defaults — nothing on the site ever collected either. Its one
          real signal, whether the mentor is paused, is the AvailabilityBanner
          above, and their reply figures are now measured in the hero header. */}

      {/* SECTION 7: WHY YOU SHOULD TRUST ME - EXPERIENCE & PROJECTS */}
      <MentorExperienceSection mentor={mentor} isOwnProfile={isOwnProfile} onMentorUpdated={onMentorUpdated} />

      <MentorProjectsSection mentor={mentor} isOwnProfile={isOwnProfile} onMentorUpdated={onMentorUpdated} />

      {/* Badges Section */}
      <motion.section
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
          <Award className="h-5 w-5 text-primary" />
          Badges & Platform Achievements
        </h2>
        <BadgeDisplay userId={mentor.id} />
      </motion.section>

      {/* SECTION 8: REVIEWS & TESTIMONIAL HIGHLIGHTS */}
      <MentorReviewHighlights
        mentor={mentor}
        canRate={canRate}
        hasRated={hasRated}
        isOwnProfile={isOwnProfile}
        ratingLoading={ratingLoading}
        onShowRatingModal={onShowRatingModal}
      />

      {/* SECTION 9: DISCOVERY - SIMILAR MENTORS */}
      <SimilarMentorsSection
        currentMentorId={mentor.id}
        department={mentor.department}
      />
    </motion.div>
  );
};

export default MentorProfileContent;
