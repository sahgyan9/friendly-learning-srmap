import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ExternalLink,
  Star,
  Trophy,
  Users,
  MessageSquare,
  BookOpen,
  Calendar,
  Target,
  FileText,
} from "lucide-react";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";
import { extractMeaningfulTokens } from "@/lib/search/query-engine";
import type { SearchResultItem } from "@/hooks/useSearchResults";

interface GoogleResultCardProps {
  item: SearchResultItem;
  query?: string;
  citationId?: number;
  className?: string;
}

/**
 * Decodes common HTML entities often present in scraped faculty bios/details.
 */
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

/**
 * Highlights meaningful subject and name tokens from query inside snippet text.
 * Uses strict word-boundary matching to prevent false subword highlights
 * (e.g. 'to' inside 'protocol' or 'can' inside 'candidates').
 */
function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!text) return null;
  const decoded = decodeHtmlEntities(text);
  if (!query || !query.trim()) return <span>{decoded}</span>;

  const tokens = extractMeaningfulTokens(query);
  if (tokens.length === 0) return <span>{decoded}</span>;

  // Build regex matching full words with word boundaries: \b(token1|token2)\w*
  const escapedTokens = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(\\b(?:${escapedTokens.join("|")})\\w*)`, "gi");
  const matchChecker = new RegExp(`^\\b(?:${escapedTokens.join("|")})`, "i");

  const parts = decoded.split(pattern);

  return (
    <span>
      {parts.map((part, i) => {
        const isMatch = matchChecker.test(part);
        return isMatch ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </span>
  );
}

export const GoogleResultCard: React.FC<GoogleResultCardProps> = ({
  item,
  query,
  citationId,
  className,
}) => {
  const navigate = useNavigate();

  const effectiveCitationId = citationId ?? (typeof item.meta?.citationId === "number" ? item.meta.citationId : undefined);
  const entityType = item.entityType || "faculty";
  const rating = (item.meta?.avg_overall ?? item.meta?.rating) as number | undefined;
  const ratingCount = (item.meta?.rating_count ?? item.meta?.review_count) as number | undefined;
  const skills = Array.isArray(item.meta?.skills)
    ? (item.meta!.skills as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const interests = Array.isArray(item.meta?.interests)
    ? (item.meta!.interests as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const tags = Array.isArray(item.meta?.tags)
    ? (item.meta!.tags as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  // Entity type is carried by the icon shape and the badge text; one neutral
  // colour for all of them so colour stays free to mean status.
  let IconComponent: React.ElementType = FacultyIcon;
  if (entityType === "mentor") IconComponent = MentorIcon;
  else if (entityType === "community") IconComponent = GroupsIcon;
  else if (entityType === "opportunity") IconComponent = Trophy;
  else if (entityType === "post") IconComponent = PostIcon;
  else if (entityType === "blog") IconComponent = BookOpen;
  else if (entityType === "student") IconComponent = Users;
  else if (entityType === "document") IconComponent = FileText;

  const logClick = () => {
    if (query && query.trim().length >= 3) {
      supabase.rpc("log_search_click", {
        p_query: query,
        p_entity_type: entityType,
        p_entity_id: item.id
      }).then(({ error }) => { if (error) console.error(error); }); // fire and forget
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If click was on a link or button, don't double navigate
    if ((e.target as HTMLElement).closest("a, button")) return;
    
    logClick();

    if (item.to && item.to !== "#") {
      navigate(item.to);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group relative flex min-w-0 cursor-pointer flex-col rounded-xl border bg-card p-4 text-left transition-colors duration-150 sm:p-5",
        effectiveCitationId
          ? "border-primary/30 hover:border-primary/50"
          : "border-border hover:border-foreground/20",
        className,
      )}
    >
      {/* Title row: the title is the link, so it looks like one */}
      <div className="mb-1 flex min-w-0 items-center gap-2.5">
        {item.image ? (
          <Avatar className="h-7 w-7 shrink-0 rounded-md border border-border">
            <AvatarImage src={item.image} alt="" className="object-cover" />
            <AvatarFallback className="text-3xs font-semibold">{getInitials(item.title)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
            <IconComponent className="h-4 w-4" />
          </span>
        )}

        <div className="min-w-0 flex-1 overflow-hidden">
          <Link
            to={item.to}
            onClick={(e) => {
              e.stopPropagation();
              logClick();
            }}
            className="block truncate text-base font-semibold leading-snug text-foreground underline-offset-2 transition-colors duration-150 group-hover:text-primary group-hover:underline"
          >
            <HighlightedText text={item.title} query={query} />
          </Link>
        </div>

        {effectiveCitationId && (
          <span
            className="tabular inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-3xs font-semibold text-primary"
            title="Cited in the CampusBrain answer"
          >
            Source {effectiveCitationId}
          </span>
        )}

        {item.badge && (
          <span className="hidden shrink-0 rounded bg-secondary px-1.5 py-0.5 text-3xs font-medium text-secondary-foreground sm:inline">
            {item.badge}
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:pl-[2.375rem] text-xs text-muted-foreground">
        {/* Star Rating Badge */}
        {typeof rating === "number" && rating > 0 && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            <span className="tabular font-medium text-foreground">{rating.toFixed(1)}</span>
            {typeof ratingCount === "number" && ratingCount > 0 && (
              <span className="tabular">({ratingCount} reviews)</span>
            )}
          </span>
        )}

        {/* Subtitle / Department / Designation */}
        {item.subtitle && (
          <span className="inline-flex min-w-0 items-center gap-1 text-foreground">
            {item.subtitle}
          </span>
        )}

        {/* Group / Community Member count */}
        {typeof item.meta?.member_count === "number" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="tabular">{item.meta.member_count} {item.meta.member_count === 1 ? "member" : "members"}</span>
          </span>
        )}

        {/* Post reply count */}
        {typeof item.meta?.comments_count === "number" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span className="tabular">{item.meta.comments_count} replies</span>
          </span>
        )}

        {/* Opportunity Deadline */}
        {typeof item.meta?.register_by === "string" && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Calendar className="h-3 w-3" />
            <span>Register by {new Date(item.meta.register_by).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </span>
        )}
      </div>

      {/* ── 4. Rich Context Snippet with Keyword Highlighting ── */}
      {item.snippet && (
        <p className="mb-3 line-clamp-2 sm:pl-[2.375rem] text-sm leading-relaxed text-muted-foreground sm:line-clamp-3">
          <HighlightedText text={item.snippet} query={query} />
        </p>
      )}

      {/* ── 5. Matched Keywords & Tags Pill Cloud ── */}
      {(skills.length > 0 || interests.length > 0 || tags.length > 0 || item.matchReason) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:pl-[2.375rem]">
          {item.matchReason && (
            <span className="inline-flex items-center gap-1 text-2xs font-medium text-foreground">
              <Target className="h-3 w-3 text-muted-foreground" aria-hidden />
              {item.matchReason}
            </span>
          )}

          {skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-2xs text-secondary-foreground"
            >
              {skill}
            </span>
          ))}

          {interests.slice(0, 3).map((interest, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-2xs text-secondary-foreground"
            >
              {interest}
            </span>
          ))}

          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-2xs text-secondary-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── 6. Google Mini-Sitelinks & Deep Actions ── */}
      {item.sitelinks && item.sitelinks.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-2.5 sm:ml-[2.375rem]">
          {item.sitelinks.map((sitelink, idx) => {
            if (sitelink.isExternal) {
              return (
                <a
                  key={idx}
                  href={sitelink.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    logClick();
                  }}
                  className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  <span>{sitelink.label}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              );
            }

            return (
              <Link
                key={idx}
                to={sitelink.to}
                onClick={(e) => {
                  e.stopPropagation();
                  logClick();
                }}
                className="inline-flex min-h-[32px] items-center text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                <span>{sitelink.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </article>
  );
};

export default GoogleResultCard;
