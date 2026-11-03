import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorCoursesSectionProps {
  mentor: EnhancedMentor;
}

export default function MentorCoursesSection({ mentor }: MentorCoursesSectionProps) {
  const courses = mentor.courses ?? [];

  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Courses taken</h2>
      <p className="mt-1 text-sm text-muted-foreground">Coursework completed at SRM AP</p>

      <ul className={`mt-4 flex flex-wrap gap-1.5 ${courses.length > 24 ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
        {courses.map((course) => (
          <li
            key={course.code}
            className="rounded-md border border-border px-2 py-0.5 text-xs text-foreground"
          >
            <span className="font-mono text-muted-foreground">{course.code}</span> {course.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
