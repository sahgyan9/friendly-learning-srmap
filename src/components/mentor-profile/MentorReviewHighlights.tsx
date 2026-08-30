import { motion } from "framer-motion";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewsList from "@/components/rating/ReviewsList";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorReviewHighlightsProps {
  mentor: EnhancedMentor;
  canRate: boolean;
  hasRated?: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

export default function MentorReviewHighlights({
  mentor,
  canRate,
  hasRated = false,
  isOwnProfile,
  ratingLoading,
  onShowRatingModal,
}: MentorReviewHighlightsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Star className="h-4 w-4 fill-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Student Reviews & Testimonials
              {mentor.review_count > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({mentor.review_count} reviews)
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">Feedback from students who learned with {mentor.name}</p>
          </div>
        </div>

        {!isOwnProfile && !ratingLoading && (
          <Button size="sm" onClick={onShowRatingModal} className="gap-1.5 font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" />
            {hasRated ? "Edit Your Review" : "Add Review"}
          </Button>
        )}
      </div>

      {/* Full Detailed Reviews List */}
      <div className="pt-2 border-t border-border/40">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          All Student Ratings
        </h3>
        <ReviewsList mentorId={mentor.id} />
      </div>
    </motion.div>
  );
}
