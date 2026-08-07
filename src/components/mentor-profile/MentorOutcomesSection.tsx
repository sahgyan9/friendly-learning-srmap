import { motion } from "framer-motion";
import { CheckCircle2, MessageSquareCode, Target } from "lucide-react";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorOutcomesSectionProps {
  mentor: EnhancedMentor;
}

export default function MentorOutcomesSection({ mentor }: MentorOutcomesSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 1. What I Can Help You Achieve */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">What I can help you achieve</h2>
            <p className="text-xs text-muted-foreground">Concrete outcomes you can reach through mentoring sessions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {mentor.outcomes.map((outcome, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3.5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-foreground leading-snug">
                {outcome}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 2. Ask Me Anything About */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareCode className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Ask me anything about</h2>
            <p className="text-xs text-muted-foreground">Topics and areas we can discuss in chat</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {mentor.ask_me_anything.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.03, y: -2 }}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground shadow-xs hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.topic}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
