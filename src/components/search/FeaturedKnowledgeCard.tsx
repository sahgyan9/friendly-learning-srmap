import React from "react";
import { Link } from "react-router-dom";
import {
  Star,
  MapPin,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Award,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Building,
} from "lucide-react";
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
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-background p-5 sm:p-6 shadow-sm",
        className,
      )}
    >
      {/* Decorative gradient orb */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-xl" />

      {/* Header with Knowledge Tag */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-2xs font-bold uppercase tracking-wider text-primary">
            {isFaculty ? "Campus Faculty Knowledge Panel" : isMentor ? "Top Mentor Profile" : "Featured Campus Entity"}
          </span>
        </div>
        <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-3xs font-semibold text-primary">
          Top Match
        </span>
      </div>

      {/* Profile Row */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl border-2 border-primary/20 shadow-md">
          <AvatarImage src={item.image ?? undefined} alt={item.title} className="object-cover" />
          <AvatarFallback className="text-base sm:text-lg font-bold bg-primary/10 text-primary">
            {getInitials(item.title)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
            {item.title}
          </h3>

          {designation && (
            <p className="text-xs sm:text-sm font-medium text-foreground/80 mt-0.5">
              {designation}
            </p>
          )}

          {department && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building className="h-3 w-3 shrink-0" />
              <span>{department}</span>
            </p>
          )}

          {/* Rating */}
          {typeof rating === "number" && rating > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" />
              </div>
              <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
              {typeof ratingCount === "number" && (
                <span className="text-xs text-muted-foreground">
                  ({ratingCount} {isFaculty ? "student reviews" : "mentorship sessions"})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio / Excerpt */}
      {item.snippet && (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-3.5 line-clamp-3">
          {decodeHtmlEntities(item.snippet)}
        </p>
      )}

      {/* Meta attributes */}
      <div className="space-y-1.5 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
        {officeLocation && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Office: <strong className="text-foreground">{officeLocation}</strong></span>
          </div>
        )}
        {school && (
          <div className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>School: <strong className="text-foreground">{school}</strong></span>
          </div>
        )}
      </div>

      {/* Tag cloud */}
      {(interests.length > 0 || skills.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2">
          {(interests.length > 0 ? interests : skills).slice(0, 5).map((t, idx) => (
            <span
              key={idx}
              className="rounded-lg bg-background/80 border border-border/60 px-2 py-0.5 text-2xs text-muted-foreground shadow-2xs"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/40">
        <Button asChild size="sm" className="rounded-xl font-medium">
          <Link to={item.to}>
            <span>View Full Profile</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>

        {isFaculty && (
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link to={`${item.to}#reviews`}>
              <span>Rate / Review</span>
            </Link>
          </Button>
        )}

        {isMentor && (
          <Button asChild variant="outline" size="sm" className="rounded-xl">
            <Link to={`${item.to}#skills`}>
              <span>Skills & Projects</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default FeaturedKnowledgeCard;
