import { MessageSquare, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

const SECTION = "rounded-xl border border-border bg-card p-5 shadow-card md:p-6";

export default function FacultyStudentSentimentCard({
  faculty,
  tagCounts,
  distribution,
}: FacultyStudentSentimentCardProps) {
  const hasRatings = faculty.rating_count > 0;

  if (!hasRatings) {
    return (
      <section className={`${SECTION} flex flex-col items-center gap-3 text-center`}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">No student ratings yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            If you have taken a course with this faculty, an anonymous rating tells the next batch what to expect.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className={`${SECTION} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ratings by criterion</h2>
          <p className="mt-1 text-sm text-muted-foreground tabular">
            Averages across {faculty.rating_count} anonymous {faculty.rating_count === 1 ? "rating" : "ratings"}
          </p>
        </div>

        <div className="space-y-4">
          {RATING_CRITERIA.map((criterion) => {
            const value = Number(CRITERION_AVERAGES[criterion.key](faculty) || 0);
            const percentage = (value / 5) * 100;
            return (
              <div key={criterion.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{criterion.label}</span>
                  <span className="font-semibold text-foreground tabular">{value.toFixed(1)}</span>
                </div>
                <Progress value={percentage} className="h-1.5" aria-label={`${criterion.label}: ${value.toFixed(1)} out of 5`} />
                <p className="text-xs text-muted-foreground">{criterion.hint}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${SECTION} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Rating distribution</h2>
          <p className="mt-1 text-sm text-muted-foreground">How many students gave each overall score</p>
        </div>

        <div className="space-y-2">
          {distribution.map(({ star, count }) => {
            const share = faculty.rating_count > 0 ? (count / faculty.rating_count) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="flex w-8 shrink-0 items-center gap-1 text-muted-foreground tabular">
                  {star}
                  <Star className="h-3.5 w-3.5" aria-label="stars" />
                </span>
                <Progress value={share} className="h-1.5 flex-1" />
                <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular">{count}</span>
              </div>
            );
          })}
        </div>

        {tagCounts.length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-foreground">What students mention</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tagCounts.map(({ tag, count }) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {tag}
                  <span className="text-muted-foreground tabular">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
