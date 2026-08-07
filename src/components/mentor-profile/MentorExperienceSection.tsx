import { motion } from "framer-motion";
import { Briefcase, Award } from "lucide-react";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorExperienceSectionProps {
  mentor: EnhancedMentor;
}

export default function MentorExperienceSection({ mentor }: MentorExperienceSectionProps) {
  if (!mentor.experiences || mentor.experiences.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Experience & Achievements</h2>
          <p className="text-xs text-muted-foreground">Track record of technical accomplishments and leadership</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {mentor.experiences.map((exp) => (
          <div
            key={exp.id}
            className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-background/50 p-4 hover:border-amber-500/30 transition-all"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-xl">
              {exp.icon}
            </div>

            <div className="space-y-0.5 min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{exp.title}</h3>
              {exp.organization && (
                <p className="text-xs font-medium text-muted-foreground">{exp.organization}</p>
              )}
              {exp.period && (
                <p className="text-[11px] text-muted-foreground/80">{exp.period}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
