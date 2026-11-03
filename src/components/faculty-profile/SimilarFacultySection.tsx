import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserRound, Star } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import {
  Faculty,
  getSimilarFaculty,
} from "@/integrations/supabase/services/faculty";

interface SimilarFacultySectionProps {
  currentFacultyId: string;
  department: string;
}

export default function SimilarFacultySection({
  currentFacultyId,
  department,
}: SimilarFacultySectionProps) {
  const [similar, setSimilar] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSimilar() {
      setLoading(true);
      const { data } = await getSimilarFaculty(department, currentFacultyId, 3);
      if (isMounted) {
        setSimilar(data || []);
        setLoading(false);
      }
    }
    loadSimilar();
    return () => {
      isMounted = false;
    };
  }, [currentFacultyId, department]);

  if (loading || similar.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">More in {department}</h2>
        <Link
          to={`/faculty?dept=${encodeURIComponent(department)}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {similar.map((fac) => {
          const hasRatings = fac.rating_count > 0;
          return (
            <Link
              key={fac.id}
              to={`/faculty/${fac.slug}`}
              className="group flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4 transition-colors duration-150 hover:border-foreground/20 hover:bg-accent/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
                  {fac.image_url ? (
                    <img
                      src={getOptimizedImageUrl(fac.image_url, { width: 120, quality: 75 })}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <UserRound className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {fac.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{fac.designation || fac.department}</p>
                </div>
              </div>

              <div className="mt-auto text-xs text-muted-foreground">
                {hasRatings ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    <span className="font-medium text-foreground tabular">{Number(fac.avg_overall).toFixed(1)}</span>
                    <span className="tabular">({fac.rating_count})</span>
                  </span>
                ) : (
                  "No ratings yet"
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
