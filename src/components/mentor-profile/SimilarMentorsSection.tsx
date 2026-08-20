import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Star, ArrowRight } from "lucide-react";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { formatDepartment } from "@/utils/user-utils";

interface SimilarMentorsSectionProps {
  currentMentorId: string;
  department: string;
}

export default function SimilarMentorsSection({
  currentMentorId,
  department,
}: SimilarMentorsSectionProps) {
  const [similarMentors, setSimilarMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSimilar() {
      try {
        const { data } = await getMentors();
        if (data) {
          const filtered = data
            .filter((m) => m.id !== currentMentorId)
            .sort((a, b) => {
              const aSameDept = a.department === department ? 1 : 0;
              const bSameDept = b.department === department ? 1 : 0;
              return bSameDept - aSameDept || b.rating - a.rating;
            })
            .slice(0, 3);
          setSimilarMentors(filtered);
        }
      } catch (err) {
        console.error("Failed to load similar mentors", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSimilar();
  }, [currentMentorId, department]);

  if (loading || similarMentors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">You may also like</h2>
            <p className="text-xs text-muted-foreground">Other active mentors in {formatDepartment(department)}</p>
          </div>
        </div>

        <Link
          to="/mentors"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          View all mentors <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        {similarMentors.map((m) => (
          <Link
            key={m.id}
            to={`/mentor/${m.id}`}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3.5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <MentorAvatar
              name={m.name}
              src={m.profile_image}
              seed={m.id}
              className="h-12 w-12 rounded-xl flex-shrink-0"
              fallbackClassName="rounded-xl text-lg"
            />

            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                {m.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {formatDepartment(m.department)}
              </p>
              {m.rating > 0 && (
                <div className="flex items-center gap-1 text-2xs font-medium text-amber-500">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span>{m.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
