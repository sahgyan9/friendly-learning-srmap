import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquareOff,
  ThumbsUp,
  GraduationCap,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  toggleReviewHelpful,
  type FacultyReview,
} from "@/integrations/supabase/services/faculty";
import { StarRating } from "./StarRating";

interface FacultyReviewsListProps {
  reviews: FacultyReview[];
  loading?: boolean;
  onChanged?: () => void;
}

function getRatingColor(score: number) {
  if (score >= 4.0) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-500/30",
      label: "Awesome",
    };
  }
  if (score >= 3.0) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-500/30",
      label: "Good",
    };
  }
  return {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/30",
    label: "Challenging",
  };
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
      <div className="space-y-4">
        {[0, 1].map((index) => (
          <Card key={index} className="overflow-hidden border-border/60">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Skeleton className="h-20 w-24 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-12 text-center">
        <MessageSquareOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
        <h3 className="text-sm font-semibold text-foreground">No student reviews yet</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Be the first to share anonymous feedback to help fellow students navigate courses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const vote = localVotes[review.id] ?? {
          voted: review.viewer_voted,
          count: review.helpful_count,
        };

        const overallScore = Number(review.overall || 0);
        const ratingTheme = getRatingColor(overallScore);

        return (
          <Card
            key={review.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md",
              review.is_own
                ? "border-primary/40 bg-primary/[0.02]"
                : "border-border/70 bg-card"
            )}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                {/* Left Side: Prominent Score Card Box */}
                <div className="flex sm:flex-col items-center justify-between sm:justify-center shrink-0 gap-2 sm:gap-1.5 p-3.5 sm:w-28 rounded-xl bg-muted/40 border border-border/60 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quality
                  </div>
                  <div
                    className={cn(
                      "flex items-center justify-center font-black tabular-nums text-2xl sm:text-3xl rounded-lg px-2.5 py-0.5",
                      ratingTheme.text
                    )}
                  >
                    {overallScore.toFixed(1)}
                  </div>
                  <div className="text-[11px] font-semibold text-muted-foreground/90">
                    {ratingTheme.label}
                  </div>

                  {/* Micro sub-scores on mobile/desktop */}
                  <div className="hidden sm:flex flex-col gap-1 w-full pt-2 mt-1 border-t border-border/50 text-[10px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Teaching</span>
                      <span className="font-semibold text-foreground">{review.teaching}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Grading</span>
                      <span className="font-semibold text-foreground">{review.grading}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Helpful</span>
                      <span className="font-semibold text-foreground">{review.helpfulness}/5</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Header, Content, Tags, Footer */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Top Bar: Course, Anonymous status, Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {review.course_code ? (
                        <Badge
                          variant="secondary"
                          className="font-bold text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                        >
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {review.course_code}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          General Feedback
                        </Badge>
                      )}

                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/80" />
                        Anonymous student
                      </span>

                      {review.is_own && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        >
                          Your review
                        </Badge>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Comment / Written Feedback */}
                  {review.comment ? (
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                      "{review.comment}"
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground/75">
                      Submitted rating and criteria scores without written comments.
                    </p>
                  )}

                  {/* Feedback Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {review.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs font-normal px-2.5 py-0.5 rounded-md bg-secondary/70 hover:bg-secondary text-foreground/85 border border-border/50"
                        >
                          <Sparkles className="h-3 w-3 mr-1 text-amber-500/80" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Footer Bar: Mobile Sub-Scores + Helpful Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    {/* Mobile subscore pills */}
                    <div className="flex sm:hidden items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>T: {review.teaching}/5</span>
                      <span>•</span>
                      <span>G: {review.grading}/5</span>
                      <span>•</span>
                      <span>H: {review.helpfulness}/5</span>
                    </div>

                    <div className="sm:ml-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 transition-colors",
                          vote.voted && "text-primary font-semibold"
                        )}
                        onClick={() => handleHelpful(review)}
                        disabled={pending === review.id || review.is_own}
                        aria-pressed={vote.voted}
                      >
                        <ThumbsUp className={cn("h-3.5 w-3.5", vote.voted && "fill-current")} />
                        <span>Helpful</span>
                        {vote.count > 0 && (
                          <span className="text-[11px] font-semibold tabular-nums">({vote.count})</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default FacultyReviewsList;
