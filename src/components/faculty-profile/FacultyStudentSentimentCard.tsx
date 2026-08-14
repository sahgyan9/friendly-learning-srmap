import { Sparkles, BarChart3, Tag, MessageSquareHeart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Faculty,
  RATING_CRITERIA,
} from "@/integrations/supabase/services/faculty";

interface FacultyStudentSentimentCardProps {
  faculty: Faculty;
  tagCounts: { tag: string; count: number }[];
  distribution: { star: number; count: number }[];
}

const CRITERION_AVERAGES: Record<string, (faculty: Faculty) => number> = {
  teaching: (faculty) => faculty.avg_teaching,
  grading: (faculty) => faculty.avg_grading,
  helpfulness: (faculty) => faculty.avg_helpfulness,
};

export default function FacultyStudentSentimentCard({
  faculty,
  tagCounts,
  distribution,
}: FacultyStudentSentimentCardProps) {
  const hasRatings = faculty.rating_count > 0;

  if (!hasRatings) {
    return (
      <Card className="relative overflow-hidden shadow-xs">
        <CardAccentBorder gradient="rose" />
        <CardContent className="p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <MessageSquareHeart className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Student Experience & Feedback</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No anonymous student ratings have been submitted for this faculty yet. Ratings help fellow students understand teaching styles and course expectations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Criteria Breakdown */}
      <Card className="relative overflow-hidden shadow-xs">
        <CardAccentBorder gradient="rose" />
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Evaluation Criteria</h2>
              <p className="text-xs text-muted-foreground">
                Averages across {faculty.rating_count} anonymous student reviews
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {RATING_CRITERIA.map((criterion) => {
              const value = Number(CRITERION_AVERAGES[criterion.key](faculty) || 0);
              const percentage = (value / 5) * 100;
              return (
                <div key={criterion.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{criterion.label}</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {value.toFixed(1)} / 5.0
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-[11px] text-muted-foreground">{criterion.hint}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution & Consensus Tags */}
      <Card className="relative overflow-hidden shadow-xs">
        <CardAccentBorder gradient="rose" />
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Student Consensus & Tags</h2>
              <p className="text-xs text-muted-foreground">What students frequently highlight</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-1.5 pt-1">
            {distribution.map(({ star, count }) => {
              const share = faculty.rating_count > 0 ? (count / faculty.rating_count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 font-medium text-muted-foreground">
                    {star} ★
                  </span>
                  <Progress value={share} className="h-1.5 flex-1" />
                  <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground text-[11px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tag Cloud */}
          {tagCounts.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                <Tag className="h-3.5 w-3.5" />
                <span>Common Feedback Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tagCounts.map(({ tag, count }) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs font-normal py-1 px-2.5 bg-muted/60"
                  >
                    {tag} <span className="ml-1 text-muted-foreground text-[10px]">({count})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
