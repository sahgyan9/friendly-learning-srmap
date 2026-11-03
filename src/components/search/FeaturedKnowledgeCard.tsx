import React from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, ArrowRight, GraduationCap, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/hooks/useSearchResults";

interface FeaturedKnowledgeCardProps {
  item: SearchResultItem;
  className?: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export const FeaturedKnowledgeCard: React.FC<FeaturedKnowledgeCardProps> = ({
  item,
  className,
}) => {
  const isFaculty = item.entityType === "faculty";
  const isMentor = item.entityType === "mentor";

  const rating = (item.meta?.avg_overall ?? item.meta?.rating) as number | undefined;
  const ratingCount = (item.meta?.rating_count ?? item.meta?.review_count) as number | undefined;
  const department = (item.meta?.department ?? item.subtitle) as string | undefined;
  const designation = item.meta?.designation as string | undefined;
  const school = item.meta?.school as string | undefined;
  const officeLocation = item.meta?.office_location as string | undefined;
  const skills = Array.isArray(item.meta?.skills)
    ? (item.meta!.skills as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const interests = Array.isArray(item.meta?.interests)
    ? (item.meta!.interests as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  return (
    <section
      aria-label={`Best match: ${item.title}`}
      className={cn("rounded-xl border border-border bg-card p-5 shadow-card sm:p-6", className)}
    >
      <p className="mb-4 text-xs font-medium text-muted-foreground">
        {isFaculty ? "Best match \u00b7 Faculty" : isMentor ? "Best match \u00b7 Senior mentor" : "Best match"}
      </p>

      {/* Identity */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 shrink-0 rounded-xl border border-border sm:h-20 sm:w-20">
          <AvatarImage src={item.image ?? undefined} alt={item.title} className="object-cover" />
          <AvatarFallback className="rounded-xl bg-secondary text-base font-semibold text-secondary-foreground sm:text-lg">
            {getInitials(item.title)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
            {item.title}
          </h3>

          {designation && (
            <p className="mt-1 text-sm text-foreground">{designation}</p>
          )}

          {department && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{department}</span>
            </p>
          )}

          {typeof rating === "number" && rating > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="tabular font-semibold text-foreground">{rating.toFixed(1)}</span>
              {typeof ratingCount === "number" && (
                <span className="tabular text-xs text-muted-foreground">
                  ({ratingCount} {isFaculty ? "student reviews" : "mentorship sessions"})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {item.snippet && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {decodeHtmlEntities(item.snippet)}
        </p>
      )}

      {(officeLocation || school) && (
        <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
          {officeLocation && (
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <dt className="text-muted-foreground">Office</dt>
              <dd className="min-w-0 truncate font-medium text-foreground">{officeLocation}</dd>
            </div>
          )}
          {school && (
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <dt className="text-muted-foreground">School</dt>
              <dd className="min-w-0 truncate font-medium text-foreground">{school}</dd>
            </div>
          )}
        </dl>
      )}

      {(interests.length > 0 || skills.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {(interests.length > 0 ? interests : skills).slice(0, 5).map((t, idx) => (
            <span
              key={idx}
              className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button asChild size="sm">
          <Link to={item.to}>
            View profile
            <ArrowRight aria-hidden />
          </Link>
        </Button>

        {isFaculty && (
          <Button asChild variant="outline" size="sm">
            <Link to={`${item.to}#reviews`}>Write a review</Link>
          </Button>
        )}

        {isMentor && (
          <Button asChild variant="outline" size="sm">
            <Link to={`${item.to}#skills`}>Skills and projects</Link>
          </Button>
        )}
      </div>
    </section>
  );
};

export default FeaturedKnowledgeCard;
