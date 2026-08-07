import { motion } from "framer-motion";
import { Star, Quote, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewsList from "@/components/rating/ReviewsList";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorReviewHighlightsProps {
  mentor: EnhancedMentor;
  canRate: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

export default function MentorReviewHighlights({
  mentor,
  canRate,
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

        {canRate && !isOwnProfile && !ratingLoading && (
          <Button size="sm" onClick={onShowRatingModal} className="gap-1.5 font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" />
            Add Review
          </Button>
        )}
      </div>

      {/* Featured Quote Snippets Carousel / Grid */}
      {mentor.review_highlights && mentor.review_highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mentor.review_highlights.map((rev) => (
            <div
              key={rev.id}
              className="relative flex flex-col justify-between rounded-xl border border-border/50 bg-background/60 p-4 shadow-2xs hover:border-amber-500/30 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < (rev.rating || 5)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-foreground/90 font-medium italic leading-relaxed">
                  "{rev.quote}"
                </p>
              </div>

              {rev.author && (
                <span className="text-[11px] font-semibold text-muted-foreground pt-2 mt-2 border-t border-border/30 block">
                  — {rev.author}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

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
