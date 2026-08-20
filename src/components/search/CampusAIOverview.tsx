import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CampusMindIcon } from "@/components/icons/CampusMindIcon";
import { CampusThinkingStatus } from "@/components/search/CampusThinkingStatus";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Trophy,
  GraduationCap,
  Users,
  UserCheck,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorField } from "@/lib/errors";
import type { SearchResultsState } from "@/hooks/useSearchResults";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIEntityBadge {
  id: string;
  name: string;
  type: "faculty" | "mentor" | "opportunity" | "community" | "post" | "document";
  to: string;
  detail: string;
}

export interface AIOverviewResult {
  verdict?: string;
  summary: string;
  citations?: { id: number; text: string; url: string; }[];
  keyInsights?: string[];
  badges?: AIEntityBadge[];
  actionRecommendation?: string | null;
}

interface CampusAIOverviewProps {
  query: string;
  results: SearchResultsState;
  onCitationsLoaded?: (citations: { id: number; text: string; url: string; }[]) => void;
  className?: string;
}

const OVERVIEW_CACHE = new Map<string, AIOverviewResult>();

const getCachedOverview = (q: string): AIOverviewResult | null => {
  const norm = q.trim().toLowerCase().replace(/\s+/g, " ");
  if (OVERVIEW_CACHE.has(norm)) {
    return OVERVIEW_CACHE.get(norm)!;
  }
  try {
    const raw = sessionStorage.getItem(`ai_overview_v6_${norm}`);
    if (raw) {
      const parsed = JSON.parse(raw) as AIOverviewResult;
      OVERVIEW_CACHE.set(norm, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage issues
  }
  return null;
};

const setCachedOverview = (q: string, data: AIOverviewResult) => {
  const norm = q.trim().toLowerCase().replace(/\s+/g, " ");
  OVERVIEW_CACHE.set(norm, data);
  try {
    sessionStorage.setItem(`ai_overview_v6_${norm}`, JSON.stringify(data));
  } catch {
    // Ignore storage issues
  }
};

export const CampusAIOverview: React.FC<CampusAIOverviewProps> = ({
  query,
  results, // Kept for compatibility
  onCitationsLoaded,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [overview, setOverview] = useState<AIOverviewResult | null>(() => {
    const trimmed = query.trim();
    return trimmed.length >= 3 ? getCachedOverview(trimmed) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasVoted, setHasVoted] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(null);

  const handleRetry = () => {
    const norm = query.trim().toLowerCase().replace(/\s+/g, " ");
    OVERVIEW_CACHE.delete(norm);
    try {
      sessionStorage.removeItem(`ai_overview_${norm}`);
    } catch {
      // Ignore storage issues
    }
    setRetryCount(c => c + 1);
  };

  useEffect(() => {
    async function checkFeatureFlag() {
      try {
        const { data, error } = await (supabase as any)
          .from('platform_settings')
          .select('value')
          .eq('key', 'enable_campus_ai_overview')
          .single();
        if (!error && data) {
          setIsFeatureEnabled(data.value === true);
        } else {
          setIsFeatureEnabled(true);
        }
      } catch (err) {
        setIsFeatureEnabled(true);
      }
    }
    checkFeatureFlag();
  }, []);

  useEffect(() => {
    if (isFeatureEnabled === false) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setOverview(null);
      setLoading(false);
      setError(false);
      return;
    }

    const cached = getCachedOverview(trimmed);
    if (cached) {
      setOverview(cached);
      setLoading(false);
      setError(false);
      if (onCitationsLoaded && cached.citations) {
        onCitationsLoaded(cached.citations);
      }
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchOverview = async () => {
      setLoading(true);
      setError(false);

      try {
        const { data, error: funcError } = await supabase.functions.invoke<AIOverviewResult>(
          "generate-ai-overview",
          {
            body: { query: trimmed },
          }
        );

        if (funcError) throw funcError;

        if (isMounted && data) {
          setOverview(data);
          setCachedOverview(trimmed, data);
          if (onCitationsLoaded && data.citations) {
            onCitationsLoaded(data.citations);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (getErrorField(err, "name") !== "AbortError") {
            console.error("AI overview generation failed:", err);
            setError(true);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchOverview();
    }, 450);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, retryCount, isFeatureEnabled]);

  const handleFeedback = async (vote: 'up' | 'down') => {
    if (!overview || hasVoted !== null || isVoting) return;

    setIsVoting(true);
    try {
      const { error } = await (supabase as any).from("ai_overview_feedback").insert({
        query_text: query.trim(),
        vote_type: vote,
        summary_text: overview.summary,
      });

      if (error) throw error;

      setHasVoted(vote);
      toast.success(vote === 'up' ? "Thank you for the feedback!" : "Feedback recorded. We will improve this.");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast.error("Could not record feedback.");
    } finally {
      setIsVoting(false);
    }
  };

  const renderBadgeIcon = (type: AIEntityBadge["type"]) => {
    switch (type) {
      case "faculty":
        return <GraduationCap className="h-3.5 w-3.5 text-rose-500" />;
      case "mentor":
        return <UserCheck className="h-3.5 w-3.5 text-violet-500" />;
      case "opportunity":
        return <Trophy className="h-3.5 w-3.5 text-amber-500" />;
      case "community":
        return <Users className="h-3.5 w-3.5 text-emerald-500" />;
      case "document":
        return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <CampusMindIcon className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const getEntityMeta = (url: string, defaultName?: string) => {
    if (url.includes("/mentor/")) {
      return {
        type: "mentor" as const,
        label: "Senior Mentor",
        icon: <UserCheck className="h-3.5 w-3.5 text-violet-500" />,
        badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
      };
    }
    if (url.includes("/faculty/")) {
      return {
        type: "faculty" as const,
        label: "Faculty",
        icon: <GraduationCap className="h-3.5 w-3.5 text-rose-500" />,
        badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
      };
    }
    if (url.includes("/opportunities/")) {
      return {
        type: "opportunity" as const,
        label: "Opportunity",
        icon: <Trophy className="h-3.5 w-3.5 text-amber-500" />,
        badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
      };
    }
    if (url.includes("/workspace-groups/") || url.includes("/communities/")) {
      return {
        type: "community" as const,
        label: "Student Group",
        icon: <Users className="h-3.5 w-3.5 text-emerald-500" />,
        badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      };
    }
    if (url.includes("/documents/") || url.includes("academic-calendar") || url.includes("code-of-conduct")) {
      return {
        type: "document" as const,
        label: "Campus Guideline",
        icon: <FileText className="h-3.5 w-3.5 text-blue-500" />,
        badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
      };
    }
    return {
      type: "post" as const,
      label: "Resource",
      icon: <CampusMindIcon className="h-3.5 w-3.5 text-primary" />,
      badgeColor: "bg-primary/10 text-primary border-primary/20",
    };
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
          <em key={index} className="italic text-foreground/90">
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
                      "inline-flex items-center justify-center min-w-[1.15rem] h-4 px-1 rounded border text-3xs font-bold transition-all shadow-2xs cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary scale-110 shadow-xs ring-2 ring-primary/30"
                        : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/50"
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
        const meta = getEntityMeta(c.url, c.text);
        return {
          id: c.id,
          text: c.text,
          url: c.url,
          detail: badge?.detail || (meta.type === "mentor" ? "Senior Mentor · Available for 1-on-1 Help" : undefined),
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

  if (isFeatureEnabled === false && query.trim().length >= 3) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-xl transition-all duration-300",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <CampusMindIcon className="h-4 w-4 opacity-50" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Overview is taking a break</h3>
            <p className="text-xs text-muted-foreground">This feature is temporarily disabled for maintenance. Check back soon!</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !overview && !error) {
    return null;
  }

  if (error && !overview) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-xl transition-all duration-300",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CampusMindIcon className="h-4 w-4 text-primary/60" />
            <span>Campus AI Overview could not generate at this moment.</span>
          </div>
          <button
            onClick={handleRetry}
            className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/25 border-l-4 border-l-primary bg-card/95 p-5 sm:p-6 sm:px-7 backdrop-blur-xl shadow-xs transition-all duration-300 ring-1 ring-primary/5",
        className,
      )}
    >
      {/* Subtle top accent gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 opacity-80" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/15 text-primary shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Campus AI Overview
          </h2>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          aria-label={collapsed ? "Expand AI Overview" : "Collapse AI Overview"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Body content */}
      {!collapsed && (
        <div className="mt-4 space-y-4 animate-in fade-in-50 duration-200">
          {loading && !overview ? (
            <CampusThinkingStatus
              className="py-6"
              iconSize="h-8 w-8"
              textSize="text-sm"
              phrases={[
                "Synthesizing campus knowledge…",
                "Connecting faculty & student mentors…",
                "Crystallizing insights…",
                "Structuring recommendations…",
              ]}
            />
          ) : overview ? (
            <>
              {/* Hero Verdict Pill / Callout if available */}
              {overview.verdict && (
                <div className="inline-flex items-center gap-2.5 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent px-4 py-2 text-xs sm:text-[13.5px] font-semibold text-foreground shadow-2xs">
                  <span className="flex h-2 w-2 rounded-full bg-primary ring-4 ring-primary/20 animate-pulse shrink-0" />
                  <span className="tracking-tight">{overview.verdict}</span>
                </div>
              )}

              {/* Main summary text */}
              <div className="text-[14.5px] sm:text-[15px] leading-[1.8] text-foreground font-normal max-w-4xl tracking-[-0.005em]">
                {renderFormattedText(overview.summary, overview.citations)}
              </div>

              {/* Key Insights structured micro-cards */}
              {distinctKeyInsights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {distinctKeyInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 dark:bg-card/60 p-3 text-xs sm:text-[13px] text-foreground/90 shadow-2xs hover:border-primary/30 transition-colors"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-3xs font-bold">
                        ✓
                      </span>
                      <div className="flex-1 leading-relaxed">
                        {renderFormattedText(insight, overview.citations)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Cited Campus Sources (Google SGE / Perplexity Style) ── */}
              {citedSources.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground/80">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Cited Campus Sources ({citedSources.length})
                    </span>
                    <span className="text-2xs text-muted-foreground hidden sm:inline">
                      Directly referenced in AI synthesis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {citedSources.map((source) => {
                      const isActive = activeCitationId === source.id;
                      return (
                        <Link
                          key={source.id}
                          to={source.url}
                          onMouseEnter={() => setActiveCitationId(source.id)}
                          onMouseLeave={() => setActiveCitationId(null)}
                          className={cn(
                            "group relative flex flex-col justify-between rounded-xl border p-3 backdrop-blur-md transition-all duration-200 text-left shadow-2xs",
                            isActive
                              ? "border-primary bg-primary/15 ring-2 ring-primary/20 shadow-sm"
                              : "border-border/60 bg-card/80 hover:border-primary/50 hover:bg-accent/50"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-2">
                              <span className={cn(
                                "inline-flex items-center justify-center h-5 px-1.5 rounded-md text-3xs font-bold border transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-primary/10 text-primary border-primary/20"
                              )}>
                                [{source.id}]
                              </span>
                              <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-4xs font-semibold uppercase tracking-wider", source.badgeColor)}>
                                {source.icon}
                                <span>{source.label}</span>
                              </span>
                            </div>

                            <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {source.text}
                            </h4>
                            {source.detail && (
                              <p className="text-2xs text-muted-foreground line-clamp-1 mt-0.5">
                                {source.detail}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-3xs text-primary group-hover:text-primary font-medium mt-2 pt-1.5 border-t border-border/30">
                            <span className="text-muted-foreground/70 group-hover:text-foreground/80 transition-colors">
                              {source.type === "document" ? "View Document" : "View Profile"}
                            </span>
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Action Badges (if different from citations) */}
              {overview.badges && overview.badges.length > 0 && citedSources.length === 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-2xs font-medium text-muted-foreground shrink-0">
                    Top Suggestions:
                  </span>
                  {overview.badges.map((badge, index) => (
                    <Link
                      key={badge.id || index}
                      to={badge.to}
                      className="group inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground/90 hover:border-primary/40 hover:bg-accent/80 hover:text-foreground transition-all duration-150 shadow-2xs"
                    >
                      {renderBadgeIcon(badge.type)}
                      <span>{badge.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Integrated Grounding & Action Footer Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-border/40 pt-3 text-2xs text-muted-foreground">
                <div className="flex items-center gap-2 flex-wrap">
                  {citedSources.some((s) => s.type === "document" || s.url?.includes("/documents/")) ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                      <FileText className="h-3 w-3" />
                      Grounded in SRM AP AY 2026-27 Documents (Always verify circulars with ERP)
                    </span>
                  ) : overview.actionRecommendation ? (
                    <span>{overview.actionRecommendation}</span>
                  ) : (
                    <span>Synthesized from SRM AP campus records</span>
                  )}
                </div>

                <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleFeedback('up')}
                    disabled={isVoting || hasVoted !== null}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      hasVoted === 'up' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                    )}
                    title="Good response"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleFeedback('down')}
                    disabled={isVoting || hasVoted !== null}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      hasVoted === 'down' ? "bg-destructive/20 text-destructive" : "text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                    )}
                    title="Bad response"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CampusAIOverview;
