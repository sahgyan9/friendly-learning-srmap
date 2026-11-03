import { Link } from "react-router-dom";
import { Star, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import type { Faculty } from "@/integrations/supabase/services/faculty";

interface FacultyCardProps {
  faculty: Faculty;
  onRate?: (faculty: Faculty) => void;
  className?: string;
}

/** Same chip budget as MentorCard so the two directories read alike. */
const MAX_INTERESTS = 3;

export function FacultyCard({ faculty, onRate, className }: FacultyCardProps) {
  const hasRatings = faculty.rating_count > 0;
  // Rows synced before the interests column existed come back without the field.
  const interests = faculty.interests ?? [];
  const extraInterests = interests.length - MAX_INTERESTS;
  const roleLine = [faculty.designation, faculty.department].filter(Boolean).join(" · ");

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col transition-colors duration-150 hover:border-foreground/20",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {faculty.image_url && (
              <AvatarImage
                src={getOptimizedImageUrl(faculty.image_url, { width: 160, quality: 75 })}
                alt=""
                loading="lazy"
                className="object-cover object-top"
              />
            )}
            <AvatarFallback className="bg-secondary">
              <UserRound className="h-5 w-5 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug">
              {/* Stretched link: the whole card opens the profile; the Rate
                  button sits above it on z-10. */}
              <Link
                to={`/faculty/${faculty.slug}`}
                className="line-clamp-2 transition-colors duration-150 after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover:text-primary focus-visible:outline-none"
              >
                {faculty.name}
              </Link>
            </h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">{roleLine}</p>
          </div>
        </div>

        {interests.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {interests.slice(0, MAX_INTERESTS).map((interest) => (
              <span
                key={interest}
                title={interest}
                className="max-w-full truncate rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {interest}
              </span>
            ))}
            {extraInterests > 0 && (
              <span className="text-xs text-muted-foreground tabular">+{extraInterests}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        {hasRatings ? (
          <span className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            <span className="font-medium tabular">{Number(faculty.avg_overall).toFixed(1)}</span>
            <span className="text-muted-foreground tabular">
              ({faculty.rating_count} {faculty.rating_count === 1 ? "rating" : "ratings"})
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No ratings yet</span>
        )}

        <Button
          size="sm"
          variant="outline"
          className="relative z-10 shrink-0"
          onClick={() => onRate?.(faculty)}
        >
          <Star />
          Rate
        </Button>
      </div>
    </Card>
  );
}

export default FacultyCard;
