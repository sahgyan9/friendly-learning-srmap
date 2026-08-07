import { motion } from "framer-motion";
import { Sparkles, Check, Zap } from "lucide-react";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface SmartMatchBannerProps {
  mentor: EnhancedMentor;
  queryTopic?: string;
}

export default function SmartMatchBanner({ mentor, queryTopic }: SmartMatchBannerProps) {
  const topSkills = mentor.skills.slice(0, 3);
  if (topSkills.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 font-extrabold text-lg shadow-xs">
            98%
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 fill-current" />
                Best Match For You
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground">
              This mentor specializes in {topSkills.join(", ")}.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {topSkills.map((sk) => (
                <span
                  key={sk}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
