import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface MentorAvailabilityCardProps {
  mentor: EnhancedMentor;
}

export default function MentorAvailabilityCard({ mentor }: MentorAvailabilityCardProps) {
  const isAvailable = mentor.is_available !== false;
  const sched = mentor.availability_schedule;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Availability & Response</h2>
            <p className="text-xs text-muted-foreground">Expected response window and weekly schedule</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {isAvailable ? sched.status_text : "Paused"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Available Days */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Active Days
          </span>
          <div className="flex flex-wrap gap-1.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
              const active = sched.available_days.includes(day);
              return (
                <span
                  key={day}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                    active
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                      : "bg-muted/30 border-border/30 text-muted-foreground/50 opacity-60"
                  }`}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>

        {/* Preferred Timing */}
        <div className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Preferred Time Slot
          </span>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>{sched.typical_time}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {sched.response_time} • {sched.response_rate}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
