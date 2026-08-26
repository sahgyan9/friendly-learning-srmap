import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, EyeOff, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import {
  getFacultyDirectoryStats,
  getTopRatedFaculty,
} from "@/integrations/supabase/services/faculty";
import type { Faculty } from "@/integrations/supabase/services/faculty";
import { StarRating } from "./StarRating";

type TopFaculty = {
  id: string;
  slug: string;
  name: string;
  department: string;
  image_url: string | null;
  avg_overall: number;
  rating_count: number;
};

/**
 * Homepage entry point for faculty ratings.
 *
 * The feature previously lived as an unlabelled tab inside /marketplace, so
 * nobody knew it existed. This puts it on the landing page front and center.
 */
export function FacultyDiscoveryCard() {
  const [stats, setStats] = useState({ faculty_count: 0, rating_count: 0, department_count: 0 });
  const [topRated, setTopRated] = useState<TopFaculty[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getFacultyDirectoryStats(), getTopRatedFaculty(4, 1)]).then(
      ([statsResult, topResult]) => {
        if (cancelled) return;
        setStats(statsResult.data);
        setTopRated((topResult.data ?? []) as TopFaculty[]);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing synced yet — don't advertise an empty directory.
  if (stats.faculty_count === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-4">
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 hover:shadow-xl hover:brightness-110 transition-all duration-300"
              >
                <Link to="/faculty">
                  Browse faculty ratings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  Know your professor before classes start
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Rate and read honest student reviews on teaching quality, grading fairness and
                  helpfulness across{" "}
                  <strong className="text-foreground">{stats.faculty_count}</strong> SRM AP faculty
                  in <strong className="text-foreground">{stats.department_count}</strong>{" "}
                  departments. Your name is never attached to a review.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="secondary"
                  className="gap-1 border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                >
                  <EyeOff className="h-3 w-3" />
                  Anonymous
                </Badge>
                {stats.rating_count > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {stats.rating_count} {stats.rating_count === 1 ? "rating" : "ratings"} so far
                  </span>
                )}
              </div>
            </div>

            {topRated.length > 0 && (
              <div className="w-full space-y-2 lg:w-80">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  Top rated right now
                </p>
                {topRated.map((member) => (
                  <Link
                    key={member.id}
                    to={`/faculty/${member.slug}`}
                    className="flex items-center gap-3 rounded-lg border bg-background/60 p-2 transition-colors hover:bg-muted"
                  >
                    {member.image_url ? (
                      <img
                        src={getOptimizedImageUrl(member.image_url, { width: 100, quality: 75 })}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-9 w-9 shrink-0 rounded-full object-cover object-top"
                      />
                    ) : (
                      <span className="h-9 w-9 shrink-0 rounded-full bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.department}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <StarRating value={Number(member.avg_overall)} size="sm" />
                      <span className="text-3xs text-muted-foreground">
                        {Number(member.avg_overall).toFixed(1)} ({member.rating_count})
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default FacultyDiscoveryCard;
