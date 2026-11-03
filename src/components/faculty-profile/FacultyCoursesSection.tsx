import { FacultyReview } from "@/integrations/supabase/services/faculty";

interface FacultyCoursesSectionProps {
  reviews: FacultyReview[];
  department: string;
}

export default function FacultyCoursesSection({
  reviews,
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
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Courses</h2>
        <p className="mt-1 text-sm text-muted-foreground">Course codes students named in their ratings</p>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {courses.map(({ code, count }) => (
          <li
            key={code}
            className="flex min-w-0 items-baseline justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
          >
            <span className="truncate font-mono text-sm font-medium text-foreground">{code}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular">
              {count} {count === 1 ? "rating" : "ratings"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
