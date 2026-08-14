import { BookMarked, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { Badge } from "@/components/ui/badge";
import { FacultyReview } from "@/integrations/supabase/services/faculty";

interface FacultyCoursesSectionProps {
  reviews: FacultyReview[];
  department: string;
}

export default function FacultyCoursesSection({
  reviews,
  department,
}: FacultyCoursesSectionProps) {
  // Aggregate distinct course codes mentioned in reviews
  const courseCounts = reviews.reduce<Record<string, number>>((acc, rev) => {
    if (rev.course_code && rev.course_code.trim()) {
      const code = rev.course_code.trim().toUpperCase();
      acc[code] = (acc[code] || 0) + 1;
    }
    return acc;
  }, {});

  const courses = Object.entries(courseCounts).map(([code, count]) => ({
    code,
    count,
  }));

  if (courses.length === 0) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden shadow-xs">
      <CardAccentBorder gradient="rose" />
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
            <BookMarked className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Courses & Subjects Taught</h2>
            <p className="text-xs text-muted-foreground">
              Courses tagged by students in their verified reviews
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
          {courses.map(({ code, count }) => (
            <div
              key={code}
              className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-3"
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{code}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {count} {count === 1 ? "review" : "reviews"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
