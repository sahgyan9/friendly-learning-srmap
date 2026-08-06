import { Link } from "react-router-dom";
import { Star, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { cn } from "@/lib/utils";
import type { Faculty } from "@/integrations/supabase/services/faculty";
import { StarRating } from "./StarRating";

interface FacultyCardProps {
  faculty: Faculty;
  onRate?: (faculty: Faculty) => void;
  className?: string;
}

export function FacultyCard({ faculty, onRate, className }: FacultyCardProps) {
  const hasRatings = faculty.rating_count > 0;
  // Rows synced before the interests column existed come back without the field.
  const interests = faculty.interests ?? [];

  return (
    <Card className={cn(
      "group relative flex flex-col overflow-hidden transition-all duration-300",
      "hover:-translate-y-0.5 hover:shadow-lg hover:border-rose-500/30",
      className,
    )}>
      {/* Solid full-width accent border — same pattern as portfolio-insight */}
      <CardAccentBorder gradient="rose" />

      {/* Subtle hover glow in rose — Faculty brand colour */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-rose-500/5 to-transparent" />

      <Link to={`/faculty/${faculty.slug}`} className="relative flex flex-1 flex-col">
        {/* Photo area */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/50">
          {faculty.image_url ? (
            <img
              src={faculty.image_url}
              alt={faculty.name}
              loading="lazy"
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              onError={(event) => {
                // Hide broken images; the fallback below is already rendered
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            /* Clean neutral fallback — no jarring colour */
            <div className="flex h-full w-full items-center justify-center bg-muted/70">
              <UserRound className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Rating chip — only shown when there are ratings */}
          {hasRatings && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm border border-border/30">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(faculty.avg_overall).toFixed(1)}
            </div>
          )}
        </div>

        {/* Text body */}
        <div className="flex flex-1 flex-col gap-1.5 px-3 pt-3 pb-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight transition-colors duration-200 group-hover:text-rose-600 dark:group-hover:text-rose-400">
            {faculty.name}
          </h3>

          {faculty.designation && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{faculty.designation}</p>
          )}

          <Badge variant="secondary" className="w-fit text-[10px] font-normal">
            {faculty.department}
          </Badge>

          {/* What they work on. Two chips is what fits without pushing the
              rating out of the card; the rest are on the profile. */}
          {interests.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {interests.slice(0, 2).map((interest) => (
                <span
                  key={interest}
                  title={interest}
                  className="max-w-full truncate rounded border border-rose-500/20 bg-rose-500/5 px-1.5 py-0.5 text-[10px] leading-tight text-rose-700 dark:text-rose-300"
                >
                  {interest}
                </span>
              ))}
              {interests.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{interests.length - 2}</span>
              )}
            </div>
          )}

          <div className="mt-auto pt-1.5">
            {hasRatings ? (
              <div className="flex items-center gap-1.5">
                <StarRating value={Number(faculty.avg_overall)} size="sm" />
                <span className="text-[11px] text-muted-foreground">
                  ({faculty.rating_count})
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">No ratings yet</span>
            )}
          </div>
        </div>
      </Link>

      {/* Rate button footer */}
      <div className="border-t border-border/50 p-2">
        <Button
          size="sm"
          variant={hasRatings ? "outline" : "default"}
          className={cn(
            "h-8 w-full gap-1.5 text-xs",
            !hasRatings && "bg-rose-500 hover:bg-rose-600 text-white border-transparent",
          )}
          onClick={() => onRate?.(faculty)}
        >
          <Star className={cn("h-3 w-3", !hasRatings && "fill-white")} />
          {hasRatings ? "Rate" : "Be the first to rate"}
        </Button>
      </div>
    </Card>
  );
}

export default FacultyCard;
