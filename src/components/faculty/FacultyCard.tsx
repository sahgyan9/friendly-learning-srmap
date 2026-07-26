import { Link } from "react-router-dom";
import { Star, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <Card className={cn("group flex flex-col overflow-hidden transition-shadow hover:shadow-md", className)}>
      <Link to={`/faculty/${faculty.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {faculty.image_url ? (
            <img
              src={faculty.image_url}
              alt={faculty.name}
              loading="lazy"
              className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserRound className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}

          {/* Score sits on the photo so the grid is scannable without reading. */}
          {hasRatings && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(faculty.avg_overall).toFixed(1)}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{faculty.name}</h3>

          {faculty.designation && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{faculty.designation}</p>
          )}

          <Badge variant="secondary" className="w-fit text-[10px] font-normal">
            {faculty.department}
          </Badge>

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

      <div className="border-t p-2">
        <Button
          size="sm"
          variant={hasRatings ? "outline" : "default"}
          className="h-8 w-full text-xs"
          onClick={() => onRate?.(faculty)}
        >
          <Star className="mr-1.5 h-3 w-3" />
          {hasRatings ? "Rate" : "Be the first to rate"}
        </Button>
      </div>
    </Card>
  );
}

export default FacultyCard;
