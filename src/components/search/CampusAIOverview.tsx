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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResultsState } from "@/hooks/useSearchResults";
import { supabase } from "@/integrations/supabase/client";

export interface AIEntityBadge {
  id: string;
  name: string;
  type: "faculty" | "mentor" | "opportunity" | "community" | "post";
  to: string;
  detail: string;
}

export interface AIOverviewResult {
  summary: string;
  keyInsights: string[];
  badges: AIEntityBadge[];
  actionRecommendation: string | null;
}

interface CampusAIOverviewProps {
  query: string;
  results: SearchResultsState;
  className?: string;
}

export const CampusAIOverview: React.FC<CampusAIOverviewProps> = ({
  query,
  results, // Not used for the AI logic anymore, but kept for compatibility
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [overview, setOverview] = useState<AIOverviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setOverview(null);
      return;
    }

    let isMounted = true;
    
    // Debounce slightly to avoid spamming the edge function while typing
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const { data, error } = await supabase.functions.invoke('generate-ai-overview', {
          body: { query: trimmed }
        });
        
        if (error) throw error;
        
        if (isMounted) {
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
    }, 600);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  if (!loading && !overview && !error) {
    return null;
  }

  // If there's an error, we fail gracefully and show nothing so we don't break the search page.
  if (error && !overview) {
    return null;
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
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
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
                {renderFormattedText(overview.summary)}
              </p>

              {/* Key Insights bullets if available */}
              {overview.keyInsights && overview.keyInsights.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  {overview.keyInsights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span>{renderFormattedText(insight)}</span>
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
              {overview.actionRecommendation && (
                <div className="flex items-center justify-between border-t border-border/40 pt-2.5 text-[11px] text-muted-foreground/80">
                  <span>{overview.actionRecommendation}</span>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default CampusAIOverview;
