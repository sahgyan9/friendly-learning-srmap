import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { MessageSquareOff, ThumbsUp, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  RATING_CRITERIA,
  toggleReviewHelpful,
  type FacultyReview,
} from "@/integrations/supabase/services/faculty";
import { StarRating } from "./StarRating";

interface FacultyReviewsListProps {
  reviews: FacultyReview[];
  loading?: boolean;
  onChanged?: () => void;
}

export function FacultyReviewsList({ reviews, loading, onChanged }: FacultyReviewsListProps) {
  const { user } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Record<string, { voted: boolean; count: number }>>({});

  const handleHelpful = async (review: FacultyReview) => {
    if (!user) {
      toast.error("Sign in to mark reviews helpful");
      return;
    }

    const current = localVotes[review.id] ?? {
      voted: review.viewer_voted,
      count: review.helpful_count,
    };

    setPending(review.id);
    const { error, voted } = await toggleReviewHelpful(review.id, current.voted);
    setPending(null);

    if (error) {
      toast.error("Could not record your vote");
      return;
    }

    setLocalVotes((previous) => ({
      ...previous,
      [review.id]: {
        voted,
        count: Math.max(0, current.count + (voted ? 1 : -1)),
      },
    }));
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((index) => (
          <Card key={index}>
            <CardContent className="space-y-3 pt-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <MessageSquareOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h3 className="mb-1 font-semibold">No reviews yet</h3>
        <p className="text-sm text-muted-foreground">
          Be the first to share what taking a course with them is like.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const vote = localVotes[review.id] ?? {
          voted: review.viewer_voted,
          count: review.helpful_count,
        };

        return (
          <Card key={review.id} className={cn(review.is_own && "border-primary/40 bg-primary/[0.03]")}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* No avatar or name: reviews are anonymous by construction. */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      Anonymous student
                      {review.is_own && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Yours
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      {review.course_code && ` · ${review.course_code}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <StarRating value={Number(review.overall)} size="sm" />
                  <span className="text-sm font-semibold tabular-nums">
                    {Number(review.overall).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-center">
                {RATING_CRITERIA.map((criterion) => (
                  <div key={criterion.key}>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {criterion.label}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">{review[criterion.key]}/5</p>
                  </div>
                ))}
              </div>

              {review.comment && (
                <p className="whitespace-pre-line text-sm leading-relaxed">{review.comment}</p>
              )}

              {review.tags && review.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {review.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className={cn("gap-1.5", vote.voted && "text-primary")}
                onClick={() => handleHelpful(review)}
                disabled={pending === review.id || review.is_own}
                aria-pressed={vote.voted}
              >
                <ThumbsUp className={cn("h-3.5 w-3.5", vote.voted && "fill-current")} />
                Helpful{vote.count > 0 && ` (${vote.count})`}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default FacultyReviewsList;
