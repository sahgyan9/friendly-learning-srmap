import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { CampusThinkingStatus } from "@/components/search/CampusThinkingStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Link2,
  RotateCw,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResultsState } from "@/hooks/useSearchResults";
import {
  useCampusAIOverview,
  getCachedOverview,
  setCachedOverview,
  type AIOverviewResult,
  type AIEntityBadge,
} from "@/hooks/useCampusAIOverview";

export type { AIEntityBadge, AIOverviewResult };
export { getCachedOverview, setCachedOverview };

export interface CampusAIOverviewProps {
  query: string;
  results?: SearchResultsState;
  overview?: AIOverviewResult | null;
  loading?: boolean;
  error?: boolean;
  isFeatureEnabled?: boolean | null;
  onRetry?: () => void;
  onFeedback?: (vote: 'up' | 'down') => Promise<void>;
  hasVoted?: 'up' | 'down' | null;
  isVoting?: boolean;
  onCitationsLoaded?: (citations: { id: number; text: string; url: string; }[]) => void;
  className?: string;
}

export const CampusAIOverview: React.FC<CampusAIOverviewProps> = ({
  query,
  overview: propOverview,
  loading: propLoading,
  error: propError,
  isFeatureEnabled: propIsFeatureEnabled,
  onRetry: propOnRetry,
  onFeedback: propOnFeedback,
  hasVoted: propHasVoted,
  isVoting: propIsVoting,
  onCitationsLoaded,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);

  // If props are passed from parent (Search.tsx), use them; otherwise fallback to internal hook
  const isControlled = propOverview !== undefined || propLoading !== undefined;
  const internalHook = useCampusAIOverview({
    query,
    enabled: !isControlled,
    onCitationsLoaded,
  });

  const overview = isControlled ? propOverview ?? null : internalHook.overview;
  const loading = isControlled ? propLoading ?? false : internalHook.loading;
  const error = isControlled ? propError ?? false : internalHook.error;
  const isFeatureEnabled = isControlled ? propIsFeatureEnabled ?? true : internalHook.isFeatureEnabled;
  const handleRetry = isControlled ? propOnRetry ?? (() => {}) : internalHook.retry;
  const handleFeedback = isControlled ? propOnFeedback ?? (() => {}) : internalHook.handleFeedback;
  const hasVoted = isControlled ? propHasVoted ?? null : internalHook.hasVoted;
  const isVoting = isControlled ? propIsVoting ?? false : internalHook.isVoting;

  // Source types are told apart by icon shape and label. They share one neutral
  // colour: a rainbow of source chips reads as decoration, not as provenance.
  const renderBadgeIcon = (type: string) => {
    const cls = "h-3.5 w-3.5 text-muted-foreground";
    switch (type) {
      case "faculty":
        return <FacultyIcon className={cls} />;
      case "mentor":
        return <MentorIcon className={cls} />;
      case "opportunity":
        return <Trophy className={cls} />;
      case "community":
        return <GroupsIcon className={cls} />;
      case "document":
        return <FileText className={cls} />;
      case "notice":
        return <Megaphone className={cls} />;
      default:
        return <Link2 className={cls} />;
    }
  };

  const getEntityMeta = (url: string) => {
    if (url.includes("/mentor/")) return { type: "mentor" as const, label: "Senior mentor" };
    if (url.includes("/faculty/")) return { type: "faculty" as const, label: "Faculty" };
    if (url.includes("/opportunities/")) return { type: "opportunity" as const, label: "Opportunity" };
    if (url.includes("/workspace-groups/") || url.includes("/communities/")) {
      return { type: "community" as const, label: "Student group" };
    }
    if (url.includes("/documents/") || url.includes("academic-calendar") || url.includes("code-of-conduct")) {
      return { type: "document" as const, label: "Campus guideline" };
    }
    if (url.includes("/articles/")) return { type: "document" as const, label: "Article" };
    if (url.includes("/notices/")) return { type: "notice" as const, label: "Official notice" };
    return { type: "post" as const, label: "Campus resource" };
  };

  // Helper to sanitize model text, fixing detached punctuation and excess spaces
  const sanitizeAIText = (text: string) => {
    if (!text) return "";
    return text
      // Fix detached punctuation: e.g. "[1] ." -> "[1]." or "[1] ," -> "[1],"
      .replace(/\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]\s*([.,;:!?])/g, "[$1]$2")
      // Fix double brackets/spaces
      .replace(/\s+\[/g, " [")
      .replace(/ {2,}/g, " ")
      .trim();
  };

  // Helper to render bold, italic markdown segments and interactive citations
  const renderFormattedText = (rawText: string, citations?: { id: number; text: string; url: string; }[]) => {
    if (!rawText) return null;
    const text = sanitizeAIText(rawText);

    // Pattern to capture **bold**, *italic*, and [1] or [1, 2] style citations
    const regex = /(\*\*.*?\*\*|\*[^*]+?\*|\[\s*\d+(?:\s*,\s*\d+)*\s*\])/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Bold text
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic text
      if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
        return (
          <em key={index} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Citation tags [1] or [1, 2]
      if (part.startsWith("[") && part.endsWith("]")) {
        const rawIds = part.slice(1, -1).split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        if (rawIds.length > 0) {
          return (
            <span key={index} className="inline-flex items-center gap-0.5 mx-0.5 align-baseline">
              {rawIds.map((id) => {
                const citation = citations?.find(c => c.id === id);
                const isActive = activeCitationId === id;
                const linkContent = (
                  <span
                    className={cn(
                      "tabular inline-flex h-4 min-w-[1.1rem] cursor-pointer items-center justify-center rounded px-1 text-3xs font-semibold transition-colors duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-primary/15 hover:text-primary"
                    )}
                  >
                    {id}
                  </span>
                );

                if (citation?.url) {
                  return (
                    <Link
                      key={id}
                      to={citation.url}
                      title={citation.text}
                      onMouseEnter={() => setActiveCitationId(id)}
                      onMouseLeave={() => setActiveCitationId(null)}
                    >
                      {linkContent}
                    </Link>
                  );
                }

                return (
                  <span
                    key={id}
                    onMouseEnter={() => setActiveCitationId(id)}
                    onMouseLeave={() => setActiveCitationId(null)}
                  >
                    {linkContent}
                  </span>
                );
              })}
            </span>
          );
        }
      }

      return <span key={index}>{part}</span>;
    });
  };

  // Process unique citation source cards (Hook called at top level before early returns)
  const citedSources = React.useMemo(() => {
    if (!overview?.citations || overview.citations.length === 0) return [];
    
    // Map badges for rich details if available
    const badgeMap = new Map<string, AIEntityBadge>();
    (overview.badges || []).forEach((b) => {
      if (b.to) badgeMap.set(b.to.toLowerCase(), b);
      if (b.name) badgeMap.set(b.name.toLowerCase(), b);
    });

    const seenUrls = new Set<string>();
    return overview.citations
      .filter((c) => {
        if (!c.url || seenUrls.has(c.url)) return false;
        seenUrls.add(c.url);
        return true;
      })
      .map((c) => {
        const badge = badgeMap.get(c.url.toLowerCase()) || badgeMap.get(c.text.toLowerCase());
        const meta = getEntityMeta(c.url);
        return {
          id: c.id,
          text: c.text,
          url: c.url,
          detail: badge?.detail || (meta.type === "mentor" ? "Available for 1-on-1 help" : undefined),
          ...meta,
        };
      });
  }, [overview]);

  // Deduplicate key insights: only show bullet points that contain NEW information not already present in the summary
  const distinctKeyInsights = React.useMemo(() => {
    if (!overview?.keyInsights || overview.keyInsights.length === 0) return [];
    if (!overview.summary) return overview.keyInsights;

    const normSummary = overview.summary.toLowerCase().replace(/[^a-z0-9]/g, "");

    return overview.keyInsights.filter((insight) => {
      const normInsight = insight.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normInsight.length < 15) return false;
      const snippet = normInsight.slice(0, 30);
      return !normSummary.includes(snippet);
    });
  }, [overview]);

  const shell = cn("rounded-xl border border-border bg-card shadow-card", className);

  if (isFeatureEnabled === false && query.trim().length >= 3) {
    return (
      <div className={cn(shell, "flex items-start gap-3 p-4")}>
        <CampusBrainIcon animate={false} className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">CampusBrain answers are paused</h3>
          <p className="text-sm text-muted-foreground">
            Answers are off while we do maintenance. The search results below are not affected.
          </p>
        </div>
      </div>
    );
  }

  if (!loading && !overview && !error) {
    return null;
  }

  if (error && !overview) {
    return (
      <div className={cn(shell, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")} role="alert">
        <div className="flex min-w-0 items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">CampusBrain could not write an answer</p>
            <p className="text-sm text-muted-foreground">The search results below are still complete.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry} className="shrink-0 self-start sm:self-auto">
          <RotateCw aria-hidden />
          Retry
        </Button>
      </div>
    );
  }

  const isGroundedInDocuments = citedSources.some(
    (s) => s.type === "document" || s.type === "notice",
  );

  return (
    <section className={shell} aria-labelledby="campus-answer-heading" aria-busy={loading && !overview}>
      {/* Header: what this is and how many sources it rests on */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <CampusBrainIcon animate={false} className="h-4 w-4 text-primary" />
          <h2 id="campus-answer-heading" className="text-sm font-semibold text-foreground">
            CampusBrain answer
          </h2>
          {citedSources.length > 0 && (
            <span className="tabular truncate text-xs text-muted-foreground">
              &middot; {citedSources.length} {citedSources.length === 1 ? "source" : "sources"}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
          aria-expanded={!collapsed}
        >
          {collapsed ? "Show" : "Hide"}
          {collapsed ? <ChevronDown aria-hidden /> : <ChevronUp aria-hidden />}
        </Button>
      </div>

      {!collapsed && (
        <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
          {loading && !overview ? (
            <div className="space-y-5">
              <CampusThinkingStatus />
              {/* Skeleton mirrors the answer: lead line, paragraph, then source rows */}
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          ) : overview ? (
            <>
              <div className="space-y-3 animate-fade-in">
                {overview.verdict && (
                  <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
                    {overview.verdict}
                  </p>
                )}

                <div className="max-w-3xl text-[15px] leading-7 text-foreground">
                  {renderFormattedText(overview.summary, overview.citations)}
                </div>

                {distinctKeyInsights.length > 0 && (
                  <ul className="max-w-3xl space-y-2 pt-1">
                    {distinctKeyInsights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm leading-6 text-foreground">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span className="min-w-0 flex-1">{renderFormattedText(insight, overview.citations)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Sources: numbered to match the inline markers, each one a link to the record */}
              {citedSources.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h3 className="text-xs font-medium text-muted-foreground">Sources</h3>
                  <ol className="grid gap-2 sm:grid-cols-2">
                    {citedSources.map((source) => {
                      const isActive = activeCitationId === source.id;
                      return (
                        <li key={source.id} className="min-w-0">
                          <Link
                            to={source.url}
                            onMouseEnter={() => setActiveCitationId(source.id)}
                            onMouseLeave={() => setActiveCitationId(null)}
                            onFocus={() => setActiveCitationId(source.id)}
                            onBlur={() => setActiveCitationId(null)}
                            className={cn(
                              "group flex min-h-[48px] items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors duration-150",
                              isActive
                                ? "border-primary/40 bg-primary/5"
                                : "border-border hover:border-foreground/20 hover:bg-accent",
                            )}
                          >
                            <span
                              className={cn(
                                "tabular mt-0.5 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded px-1 text-3xs font-semibold transition-colors duration-150",
                                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                              )}
                            >
                              {source.id}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-2">
                                {source.text}
                              </span>
                              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                                {renderBadgeIcon(source.type)}
                                <span className="truncate">
                                  {source.label}
                                  {source.detail ? ` · ${source.detail}` : ""}
                                </span>
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* Without citations, the model's suggested records are the next best provenance */}
              {overview.badges && overview.badges.length > 0 && citedSources.length === 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h3 className="text-xs font-medium text-muted-foreground">Mentioned in this answer</h3>
                  <div className="flex flex-wrap gap-2">
                    {overview.badges.map((badge, index) => (
                      <Link
                        key={badge.id || index}
                        to={badge.to}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
                      >
                        {renderBadgeIcon(badge.type)}
                        <span className="truncate">{badge.name}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance note and feedback */}
              <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  {isGroundedInDocuments
                    ? "Based on SRM AP documents for AY 2026-27. Confirm circulars on the ERP before acting on them."
                    : overview.actionRecommendation
                      ? overview.actionRecommendation
                      : "Generated from Friendly Learning campus records. Check the sources before relying on it."}
                </p>

                <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                  <span className="mr-1 text-xs text-muted-foreground">Helpful?</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFeedback('up')}
                    disabled={isVoting}
                    className={cn("h-8 w-8", hasVoted === 'up' ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground")}
                    title={hasVoted === 'up' ? "Undo positive rating" : "Yes, this helped"}
                    aria-label={hasVoted === 'up' ? "Undo positive rating" : "Yes, this helped"}
                    aria-pressed={hasVoted === 'up'}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFeedback('down')}
                    disabled={isVoting}
                    className={cn("h-8 w-8", hasVoted === 'down' ? "bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive" : "text-muted-foreground")}
                    title={hasVoted === 'down' ? "Undo negative rating" : "No, this was not helpful"}
                    aria-label={hasVoted === 'down' ? "Undo negative rating" : "No, this was not helpful"}
                    aria-pressed={hasVoted === 'down'}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default CampusAIOverview;
