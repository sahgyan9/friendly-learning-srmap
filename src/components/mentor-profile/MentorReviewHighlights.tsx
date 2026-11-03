import { Star } from "lucide-react";
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
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Reviews
            {mentor.review_count > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground tabular">{mentor.review_count}</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">From students who talked to {mentor.name}</p>
        </div>

        {!isOwnProfile && !ratingLoading && (
          <Button size="sm" variant="outline" onClick={onShowRatingModal}>
            <Star />
            {hasRated ? "Edit your review" : "Write a review"}
          </Button>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <ReviewsList mentorId={mentor.id} />
      </div>
    </section>
  );
}
