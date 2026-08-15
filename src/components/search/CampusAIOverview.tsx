import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResultsState } from "@/hooks/useSearchResults";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIEntityBadge {
  id: string;
  name: string;
  type: "faculty" | "mentor" | "opportunity" | "community" | "post";
  to: string;
  detail: string;
}

export interface AIOverviewResult {
  summary: string;
  citations?: { id: number; text: string; url: string; }[];
  keyInsights?: string[];
  badges?: AIEntityBadge[];
  actionRecommendation?: string | null;
}

interface CampusAIOverviewProps {
  query: string;
  results: SearchResultsState;
  className?: string;
}

const OVERVIEW_CACHE = new Map<string, AIOverviewResult>();

const getCachedOverview = (q: string): AIOverviewResult | null => {
  const norm = q.trim().toLowerCase().replace(/\s+/g, " ");
  if (OVERVIEW_CACHE.has(norm)) {
    return OVERVIEW_CACHE.get(norm)!;
  }
  try {
    const raw = sessionStorage.getItem(`ai_overview_${norm}`);
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
    sessionStorage.setItem(`ai_overview_${norm}`, JSON.stringify(data));
  } catch {
    // Ignore storage issues
  }
};

export const CampusAIOverview: React.FC<CampusAIOverviewProps> = ({
  query,
  results, // Not used for the AI logic anymore, but kept for compatibility
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
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
      // Ignore storage errors
    }
    setRetryCount((prev) => prev + 1);
  };

  useEffect(() => {
    supabase.from('platform_settings' as any)
      .select('value')
      .eq('id', 'ai_overview_enabled')
      .single()
      .then(({ data }) => {
        if (data) {
          const rawValue = (data as any).value;
          setIsFeatureEnabled(rawValue === 'true' || rawValue === true);
        } else {
          setIsFeatureEnabled(true);
        }
      });
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || isFeatureEnabled === false) {
      setOverview(null);
      setLoading(false);
      setError(false);
      return;
    }

    // Check if we already have this query cached in memory or sessionStorage
    const cached = getCachedOverview(trimmed);
    if (cached) {
      setOverview(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);
    
    // Debounce slightly to avoid spamming the edge function while typing
    const timeoutId = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-ai-overview', {
          body: { query: trimmed }
        });
        
        if (error) throw error;
        
        if (isMounted && data) {
          setCachedOverview(trimmed, data);
          setOverview(data);
        }
      } catch (err) {
        console.error("AI Overview failed:", err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [query, retryCount, isFeatureEnabled]);

  const handleFeedback = async (vote: 'up' | 'down') => {
    if (hasVoted || isVoting || !overview) return;
    
    setIsVoting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error } = await supabase.from('ai_overview_feedback' as any).insert({
        user_id: authData?.user?.id ?? null,
        query: query.trim(),
        response: overview as any,
        is_helpful: vote === 'up'
      });
      
      if (!error) {
        setHasVoted(vote);
        toast.success("Thank you for your feedback!");
      } else {
        console.error("Failed to submit feedback:", error);
        toast.error("Could not record feedback. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast.error("Could not record feedback.");
    } finally {
      setIsVoting(false);
    }
  };

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
            <Sparkles className="h-4 w-4 opacity-50" />
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
            <Sparkles className="h-4 w-4 text-primary/60" />
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
      default:
        return <Sparkles className="h-3.5 w-3.5 text-primary" />;
    }
  };

  // Helper to render bold markdown segments nicely
  const renderFormattedText = (text: string, citations?: { id: number; text: string; url: string; }[]) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\[\d+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("[") && part.endsWith("]")) {
        const idStr = part.slice(1, -1);
        const id = parseInt(idStr, 10);
        if (!isNaN(id) && citations) {
          const citation = citations.find(c => c.id === id);
          if (citation) {
            return (
              <Link
                key={index}
                to={citation.url}
                title={citation.text}
                className="inline-flex items-center justify-center min-w-[1.125rem] h-4 px-0.5 mx-0.5 rounded border border-primary/20 bg-primary/10 text-[9px] font-bold text-primary hover:bg-primary/20 hover:border-primary/40 transition-colors align-super"
              >
                {id}
              </Link>
            );
          }
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/90 to-background p-4 sm:p-5 backdrop-blur-xl shadow-xs transition-all duration-300",
        className,
      )}
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/15 blur-2xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/20 text-primary shadow-xs">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              Campus AI Overview
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.2 text-[10px] font-medium text-primary/90">
              AI Mode
            </span>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={collapsed ? "Expand AI Overview" : "Collapse AI Overview"}
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {/* Body content */}
      {!collapsed && (
        <div className="mt-3.5 space-y-3.5 animate-in fade-in-50 duration-200">
          {loading && !overview ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
              <p className="text-xs font-medium animate-pulse">Generating answer from campus resources...</p>
            </div>
          ) : overview ? (
            <>
              {/* Main summary paragraph */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {renderFormattedText(overview.summary, overview.citations)}
              </p>

              {/* Key Insights bullets if available */}
              {overview.keyInsights && overview.keyInsights.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  {overview.keyInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{renderFormattedText(insight, overview.citations)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Action Badges */}
              {overview.badges && overview.badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground shrink-0">
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

              {/* Action Recommendation Footer */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                <span className="text-[11px] text-muted-foreground/80">
                  {overview.actionRecommendation}
                </span>
                <div className="flex items-center gap-1">
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
