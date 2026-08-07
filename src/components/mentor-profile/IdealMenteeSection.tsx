import { motion } from "framer-motion";
import { UserCheck, Sparkles } from "lucide-react";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface IdealMenteeSectionProps {
  mentor: EnhancedMentor;
}

export default function IdealMenteeSection({ mentor }: IdealMenteeSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm relative overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserCheck className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Perfect if you are...</h2>
          <p className="text-xs text-muted-foreground">Self-select if this mentor's guidance aligns with your goals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {mentor.ideal_mentees.map((criterion, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl border border-primary/15 bg-background/80 p-3.5 shadow-2xs hover:border-primary/40 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
              ✓
            </div>
            <span className="text-sm font-medium text-foreground">{criterion}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
