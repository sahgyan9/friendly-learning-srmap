import { motion } from "framer-motion";
import { Sparkles, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface CategorizedSkillsDisplayProps {
  mentor: EnhancedMentor;
}

export default function CategorizedSkillsDisplay({ mentor }: CategorizedSkillsDisplayProps) {
  const categories = Object.entries(mentor.categorized_skills);

  if (categories.length === 0) {
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
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
          <Code2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Skills & Expertise</h2>
          <p className="text-xs text-muted-foreground">Categorized technology stacks and tools</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {categories.map(([categoryName, skillList], catIdx) => (
          <div
            key={categoryName}
            className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-2 hover:border-indigo-500/30 transition-colors"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {categoryName}
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {skillList.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="bg-indigo-50/80 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 border border-indigo-200/50 dark:border-indigo-800/50 font-medium text-xs px-2.5 py-1"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
