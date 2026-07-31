import { motion } from "framer-motion";
import { GraduationCap, Star, University } from "lucide-react";

import MentorAvatar from "@/components/mentors/MentorAvatar";
import MentorProfileActions from "./MentorProfileActions";
import { Badge } from "@/components/ui/badge";
import { Mentor } from "@/types/mentor";
import { formatDepartment } from "@/utils/user-utils";

interface MentorProfileSidebarProps {
  mentor: Mentor;
  canRate: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

/**
 * Identity and the call to action, in a card that stays put while the sections
 * on the right scroll.
 *
 * Connect used to sit in a row under the header, so on any profile with a real
 * bio and a dozen skills it scrolled away and the page ended with a wall of
 * reviews and no way to act on them.
 */
const MentorProfileSidebar = ({
  mentor,
  canRate,
  ratingLoading,
  onShowRatingModal,
}: MentorProfileSidebarProps) => {
  const rated = mentor.review_count > 0 && mentor.rating > 0;

  return (
    <motion.aside
      className="lg:sticky lg:top-32 lg:self-start"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <MentorAvatar
            name={mentor.name}
            src={mentor.profile_image}
            seed={mentor.id}
            className="h-28 w-28 rounded-xl shadow-md ring-2 ring-border"
            fallbackClassName="rounded-xl text-3xl"
          />

          {/* Wraps rather than truncates: this is the one place on the site
              where a person's full name should always be readable. */}
          <h1 className="mt-4 text-xl font-bold leading-tight text-foreground">{mentor.name}</h1>

          {mentor.department && (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDepartment(mentor.department)}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {mentor.is_alumni && (
              <Badge
                variant="secondary"
                className="gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
              >
                <GraduationCap className="h-3 w-3" />
                Alumni
                {mentor.graduation_year ? ` '${String(mentor.graduation_year).slice(-2)}` : ""}
              </Badge>
            )}

            {rated ? (
              <span className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1">
                <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                <span className="text-sm font-medium text-foreground">
                  {mentor.rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">({mentor.review_count})</span>
              </span>
            ) : (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              >
                New Mentor
              </Badge>
            )}
          </div>

          {mentor.is_alumni && (mentor.company || mentor.job_title) && (
            <p className="mt-2 text-sm text-muted-foreground">
              {[mentor.job_title, mentor.company].filter(Boolean).join(" at ")}
            </p>
          )}

          {mentor.university && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <University className="h-4 w-4 flex-shrink-0" />
              {mentor.university}
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <MentorProfileActions
            mentor={mentor}
            canRate={canRate}
            ratingLoading={ratingLoading}
            onShowRatingModal={onShowRatingModal}
          />
        </div>
      </div>
    </motion.aside>
  );
};

export default MentorProfileSidebar;
