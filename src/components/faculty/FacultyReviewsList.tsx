import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquareOff,
  ThumbsUp,
  UserRound,
  BookOpen,
  Quote,
} from "lucide-react";

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
          <Card key={index} className="overflow-hidden border-border/60">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-14 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-12 text-center">
        <MessageSquareOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
        <h3 className="text-sm font-semibold text-foreground">No student reviews yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Be the first to share anonymous feedback to help fellow students navigate courses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {reviews.map((review) => {
        const vote = localVotes[review.id] ?? {
          voted: review.viewer_voted,
          count: review.helpful_count,
        };

        const overallScore = Number(review.overall || 0);

        return (
          <Card
            key={review.id}
            className={cn(
              "group relative overflow-hidden transition-all duration-200 hover:border-border hover:shadow-xs",
              review.is_own
                ? "border-rose-500/30 bg-rose-500/[0.02] dark:bg-rose-950/[0.05]"
                : "border-border/60 bg-card/80"
            )}
          >
            <CardContent className="p-5 space-y-3.5">
              {/* Header: User Info + Overall Score */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/60 text-muted-foreground border border-border/50 shadow-2xs">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Anonymous student
                      </span>
                      {review.is_own && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[9px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        >
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>{formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}</span>
                      {review.course_code && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            {review.course_code}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overall Rating Pill */}
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 px-2.5 py-1 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  <StarRating value={overallScore} size="sm" />
                  <span className="text-xs font-bold tabular-nums">
                    {overallScore.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Written Comment (if any) */}
              {review.comment && (
                <div className="relative pl-3 border-l-2 border-primary/30 py-0.5">
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {review.comment}
                  </p>
                </div>
              )}

              {/* Tags & Sub-criteria Chips in a Clean Flow */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {/* Descriptive Feedback Tags */}
                {review.tags && review.tags.length > 0 && (
                  review.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[11px] font-normal px-2 py-0.5 bg-muted/60 hover:bg-muted text-foreground/80 border border-border/40"
                    >
                      {tag}
                    </Badge>
                  ))
                )}

                {/* Compact Inline Criteria Indicators */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                  {RATING_CRITERIA.map((criterion, idx) => (
                    <span
                      key={criterion.key}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/40 text-[10px]"
                      title={criterion.hint}
                    >
                      <span className="text-muted-foreground/70">{criterion.label.split(" ")[0]}:</span>
                      <span className="font-semibold text-foreground/80 tabular-nums">
                        {review[criterion.key]}/5
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: Helpful Vote Action */}
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5 transition-colors",
                    vote.voted && "text-rose-600 dark:text-rose-400 font-semibold"
                  )}
                  onClick={() => handleHelpful(review)}
                  disabled={pending === review.id || review.is_own}
                  aria-pressed={vote.voted}
                >
                  <ThumbsUp className={cn("h-3 w-3", vote.voted && "fill-current")} />
                  <span>Helpful</span>
                  {vote.count > 0 && (
                    <span className="text-[11px] opacity-80 tabular-nums">({vote.count})</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default FacultyReviewsList;
