import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Courses Taken</h2>
          <p className="text-xs text-muted-foreground">Verified coursework from SRM AP</p>
        </div>
      </div>

      <div className={`flex flex-wrap gap-1.5 ${courses.length > 24 ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
        {courses.map((course) => (
          <Badge
            key={course.code}
            variant="secondary"
            className="bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-800/50 font-medium text-xs px-2.5 py-1"
          >
            {course.code} · {course.name}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
}
