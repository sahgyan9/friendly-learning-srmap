import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight, UserRound, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <Card className="relative overflow-hidden shadow-xs">
      <CardAccentBorder gradient="rose" />
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                More Faculty in {department}
              </h2>
              <p className="text-xs text-muted-foreground">
                Explore colleagues and researchers in the same academic department
              </p>
            </div>
          </div>

          <Button asChild variant="ghost" size="sm" className="gap-1 self-start sm:self-auto text-xs">
            <Link to={`/faculty?dept=${encodeURIComponent(department)}`}>
              View all in {department}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          {similar.map((fac) => {
            const hasRatings = fac.rating_count > 0;
            return (
              <Link
                key={fac.id}
                to={`/faculty/${fac.slug}`}
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center">
                      {fac.image_url ? (
                        <img
                          src={getOptimizedImageUrl(fac.image_url, { width: 120, quality: 75 })}
                          alt={fac.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <UserRound className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {fac.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {fac.designation || fac.department}
                      </div>
                    </div>
                  </div>

                  {/* Interests snippet */}
                  {fac.interests && fac.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {fac.interests.slice(0, 2).map((item) => (
                        <span
                          key={item}
                          className="inline-block rounded-md bg-muted/70 px-2 py-0.5 text-3xs text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  {hasRatings ? (
                    <div className="flex items-center gap-1 text-foreground font-semibold">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{Number(fac.avg_overall).toFixed(1)}</span>
                      <span className="text-2xs text-muted-foreground font-normal">
                        ({fac.rating_count})
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xs">Unrated</span>
                  )}
                  <span className="text-2xs group-hover:translate-x-0.5 transition-transform text-primary font-medium inline-flex items-center gap-0.5">
                    View profile →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
