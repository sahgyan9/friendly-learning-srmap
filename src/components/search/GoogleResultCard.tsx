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
  Sparkles,
  CheckCircle2,
  MapPin,
  Clock,
  ThumbsUp,
  Award,
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
          <strong key={i} className="font-semibold text-foreground bg-primary/10 dark:bg-primary/20 px-0.5 rounded">
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

  // Theme badges and icons
  let IconComponent = FacultyIcon;
  let iconBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  let badgeColor = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";

  if (entityType === "mentor") {
    IconComponent = MentorIcon;
    iconBg = "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
    badgeColor = "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20";
  } else if (entityType === "community") {
    IconComponent = GroupsIcon;
    iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    badgeColor = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  } else if (entityType === "opportunity") {
    IconComponent = Trophy;
    iconBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  } else if (entityType === "post") {
    IconComponent = PostIcon;
    iconBg = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  } else if (entityType === "blog") {
    IconComponent = BookOpen;
    iconBg = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    badgeColor = "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20";
  } else if (entityType === "student") {
    IconComponent = Users;
    iconBg = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    badgeColor = "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
  } else if (entityType === "document") {
    IconComponent = FileText;
    iconBg = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    badgeColor = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
  }

  const breadcrumbText = item.breadcrumb || `friendlylearning.in › ${entityType} › ${item.id.slice(0, 10)}`;

  const logClick = () => {
    if (query && query.trim().length >= 3) {
      supabase.rpc("log_search_click" as any, {
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
        "group relative flex flex-col rounded-2xl border bg-card/70 dark:bg-card/40 p-4 sm:p-5",
        effectiveCitationId
          ? "border-primary/40 bg-gradient-to-r from-primary/[0.04] via-card/80 to-card/60 ring-1 ring-primary/20 shadow-xs"
          : "border-border/40 hover:border-primary/40 hover:bg-accent/30",
        "hover:shadow-md transition-all duration-200 cursor-pointer text-left",
        className,
      )}
    >
      {/* ── 1. Google SERP Breadcrumb / URL Hierarchy Line ── */}
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        {item.image ? (
          <Avatar className="h-6 w-6 shrink-0 rounded-md border border-border/50">
            <AvatarImage src={item.image} alt="" className="object-cover" />
            <AvatarFallback className="text-3xs font-semibold">{getInitials(item.title)}</AvatarFallback>
          </Avatar>
        ) : (
          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border", iconBg)}>
            <IconComponent className="h-3.5 w-3.5" />
          </span>
        )}

        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <span className="truncate text-xs font-mono text-muted-foreground/80 dark:text-muted-foreground/70">
            {breadcrumbText}
          </span>
        </div>

        {effectiveCitationId && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-3xs font-bold text-primary">
            [{effectiveCitationId}] Cited in Overview
          </span>
        )}

        {item.badge && (
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider",
              badgeColor,
            )}
          >
            {item.badge}
          </span>
        )}
      </div>

      {/* ── 2. Clickable Search Headline (Google Blue / Primary Link) ── */}
      <div className="mb-1.5">
        <Link
          to={item.to}
          onClick={(e) => {
            e.stopPropagation();
            logClick();
          }}
          className="text-base sm:text-lg font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:underline underline-offset-2 transition-colors inline-block leading-snug"
        >
          <HighlightedText text={item.title} query={query} />
        </Link>
      </div>

      {/* ── 3. Rich Snippet Meta Row (Stars, Reviews, Dept, Member Count, Dates) ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
        {/* Star Rating Badge */}
        {typeof rating === "number" && rating > 0 && (
          <div className="inline-flex items-center gap-1 font-medium text-foreground/90 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            <span className="tabular-nums font-semibold">{rating.toFixed(1)}</span>
            {typeof ratingCount === "number" && ratingCount > 0 && (
              <span className="text-muted-foreground font-normal">({ratingCount} reviews)</span>
            )}
          </div>
        )}

        {/* Subtitle / Department / Designation */}
        {item.subtitle && (
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
            {item.subtitle}
          </span>
        )}

        {/* Group / Community Member count */}
        {typeof item.meta?.member_count === "number" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{item.meta.member_count} {item.meta.member_count === 1 ? "member" : "members"}</span>
          </span>
        )}

        {/* Post reply count */}
        {typeof item.meta?.comments_count === "number" && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{item.meta.comments_count} replies</span>
          </span>
        )}

        {/* Opportunity Deadline */}
        {typeof item.meta?.register_by === "string" && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <Calendar className="h-3 w-3" />
            <span>Register by {new Date(item.meta.register_by).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </span>
        )}
      </div>

      {/* ── 4. Rich Context Snippet with Keyword Highlighting ── */}
      {item.snippet && (
        <p className="text-xs sm:text-sm text-foreground/80 dark:text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-3 mb-2.5">
          <HighlightedText text={item.snippet} query={query} />
        </p>
      )}

      {/* ── 5. Matched Keywords & Tags Pill Cloud ── */}
      {(skills.length > 0 || interests.length > 0 || tags.length > 0 || item.matchReason) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-0.5">
          {item.matchReason && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-2xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              {item.matchReason}
            </span>
          )}

          {skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-2xs text-muted-foreground"
            >
              {skill}
            </span>
          ))}

          {interests.slice(0, 3).map((interest, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-2xs text-muted-foreground"
            >
              {interest}
            </span>
          ))}

          {tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-2xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── 6. Google Mini-Sitelinks & Deep Actions ── */}
      {item.sitelinks && item.sitelinks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 mt-auto">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-colors"
                >
                  <span>{sitelink.label}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
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
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors"
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
