import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
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
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">More mentors</h2>
          <p className="mt-1 text-sm text-muted-foreground">Others in {formatDepartment(department)} first</p>
        </div>
        <Link
          to="/mentors"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {similarMentors.map((m) => (
          <Link
            key={m.id}
            to={`/mentor/${m.slug || m.id}`}
            className="group flex min-w-0 items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:border-foreground/20 hover:bg-accent/50"
          >
            <MentorAvatar
              name={m.name}
              src={m.profile_image}
              seed={m.id}
              className="h-10 w-10 shrink-0"
              fallbackClassName="text-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                {m.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDepartment(m.department)}
                {m.rating > 0 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="tabular">{m.rating.toFixed(1)}</span>
                  </span>
                )}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
