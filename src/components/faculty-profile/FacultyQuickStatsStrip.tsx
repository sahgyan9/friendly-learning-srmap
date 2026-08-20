import { motion } from "framer-motion";
import {
  MapPin,
  GraduationCap,
  Sparkles,
  HeartHandshake,
  MessageSquareQuote,
  Clock,
  BookOpen,
} from "lucide-react";
import { Faculty } from "@/integrations/supabase/services/faculty";

interface FacultyQuickStatsStripProps {
  faculty: Faculty;
  interestsCount: number;
}

export default function FacultyQuickStatsStrip({
  faculty,
  interestsCount,
}: FacultyQuickStatsStripProps) {
  const hasRatings = faculty.rating_count > 0;

  // Determine skimmable qualitative assessment
  const teachingScore = Number(faculty.avg_teaching || faculty.avg_overall || 0);
  const helpfulnessScore = Number(faculty.avg_helpfulness || faculty.avg_overall || 0);

  const getTeachingLabel = (score: number) => {
    if (!hasRatings) return "Awaiting ratings";
    if (score >= 4.5) return "Exceptional Clarity";
    if (score >= 4.0) return "Clear & Structured";
    if (score >= 3.0) return "Standard Pace";
    return "Rigorous Material";
  };

  const getHelpfulnessLabel = (score: number) => {
    if (!hasRatings) return "Awaiting ratings";
    if (score >= 4.5) return "Very Approachable";
    if (score >= 4.0) return "Helpful with Doubts";
    if (score >= 3.0) return "Office Hours";
    return "By Appointment";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {/* 1. Academic Discipline */}
      <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Department</span>
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground truncate" title={faculty.department}>
            {faculty.department}
          </div>
          <div className="text-2xs text-muted-foreground mt-0.5">
            {interestsCount > 0 ? `${interestsCount} research domains` : faculty.school || "SRM AP Faculty"}
          </div>
        </div>
      </div>

      {/* 2. Research Focus */}
      <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Research</span>
          <BookOpen className="h-4 w-4 text-rose-500" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground truncate">
            {faculty.interests && faculty.interests[0] ? faculty.interests[0] : "Active Research"}
          </div>
          <div className="text-2xs text-muted-foreground mt-0.5">
            {interestsCount > 1 ? `+${interestsCount - 1} more specializations` : "Research active"}
          </div>
        </div>
      </div>

      {/* 3. Teaching Quality */}
      <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Teaching Quality</span>
          <Sparkles className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">
              {hasRatings ? `${teachingScore.toFixed(1)} / 5.0` : "New Profile"}
            </span>
          </div>
          <div className="text-2xs text-muted-foreground mt-0.5">
            {getTeachingLabel(teachingScore)}
          </div>
        </div>
      </div>

      {/* 4. Approachability / Doubts */}
      <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between text-muted-foreground mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Approachability</span>
          <HeartHandshake className="h-4 w-4 text-emerald-500" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">
              {hasRatings ? `${helpfulnessScore.toFixed(1)} / 5.0` : "Faculty Office"}
            </span>
          </div>
          <div className="text-2xs text-muted-foreground mt-0.5">
            {getHelpfulnessLabel(helpfulnessScore)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
