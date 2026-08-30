import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getErrorField } from "@/lib/errors";
import { toast } from "sonner";

export interface AIEntityBadge {
  id: string;
  name: string;
  type: "faculty" | "mentor" | "opportunity" | "community" | "post" | "document" | "notice";
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

const OVERVIEW_CACHE = new Map<string, AIOverviewResult>();

export const getCachedOverview = (q: string): AIOverviewResult | null => {
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

export const setCachedOverview = (q: string, data: AIOverviewResult) => {
  const norm = q.trim().toLowerCase().replace(/\s+/g, " ");
  OVERVIEW_CACHE.set(norm, data);
  try {
    sessionStorage.setItem(`ai_overview_v6_${norm}`, JSON.stringify(data));
  } catch {
    // Ignore storage issues
  }
};

export const getFeedbackSessionId = (): string => {
  if (typeof window === "undefined") return "ssr-session";
  try {
    let id = localStorage.getItem("fl_ai_feedback_session_id");
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem("fl_ai_feedback_session_id", id);
    }
    return id;
  } catch {
    return "anon-session";
  }
};

let featureFlagCache: boolean | null = null;
let featureFlagPromise: Promise<boolean> | null = null;

async function getAIOverviewFeatureFlag(): Promise<boolean> {
  if (featureFlagCache !== null) return featureFlagCache;
  if (!featureFlagPromise) {
    featureFlagPromise = (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("platform_settings")
          .select("value")
          .eq("key", "enable_campus_ai_overview")
          .single();
        if (!error && data) {
          featureFlagCache = data.value === true;
        } else {
          featureFlagCache = true;
        }
      } catch {
        featureFlagCache = true;
      }
      return featureFlagCache;
    })();
  }
  return featureFlagPromise;
}

interface UseCampusAIOverviewOptions {
  query: string;
  enabled?: boolean;
  onCitationsLoaded?: (citations: { id: number; text: string; url: string; }[]) => void;
}

export function useCampusAIOverview({
  query,
  enabled = true,
  onCitationsLoaded,
}: UseCampusAIOverviewOptions) {
  const trimmed = query.trim();
  const cachedInitial = trimmed.length >= 3 ? getCachedOverview(trimmed) : null;

  const [overview, setOverview] = useState<AIOverviewResult | null>(cachedInitial);
  const [loading, setLoading] = useState<boolean>(() => Boolean(enabled && trimmed.length >= 3 && !cachedInitial));
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => Boolean(enabled && trimmed.length >= 3 && !cachedInitial));
  const [error, setError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(featureFlagCache);

  const onCitationsLoadedRef = useRef(onCitationsLoaded);
  onCitationsLoadedRef.current = onCitationsLoaded;

  const handleRetry = useCallback(() => {
    const norm = query.trim().toLowerCase().replace(/\s+/g, " ");
    OVERVIEW_CACHE.delete(norm);
    try {
      sessionStorage.removeItem(`ai_overview_v6_${norm}`);
    } catch {
      // Ignore storage issues
    }
    setRetryCount((c) => c + 1);
  }, [query]);

  // Check feature flag once
  useEffect(() => {
    let isMounted = true;
    getAIOverviewFeatureFlag().then((flag) => {
      if (isMounted) {
        setIsFeatureEnabled(flag);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setHasVoted(null);
    setIsVoting(false);

    if (!enabled || trimmed.length < 3) {
      setOverview(null);
      setLoading(false);
      setIsInitialLoading(false);
      setError(false);
      return;
    }

    const cached = getCachedOverview(trimmed);
    if (cached) {
      setOverview(cached);
      setLoading(false);
      setIsInitialLoading(false);
      setError(false);
      if (onCitationsLoadedRef.current && cached.citations) {
        onCitationsLoadedRef.current(cached.citations);
      }
      return;
    }

    let isMounted = true;
    const isRetry = retryCount > 0;
    setLoading(true);
    if (!isRetry) {
      setIsInitialLoading(true);
    }
    setError(false);

    const controller = new AbortController();

    // Safety timeout: don't hold loading state longer than 7 seconds
    const timeoutTimer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("CampusBrain AI overview timed out after 7s");
        setIsInitialLoading(false);
        setLoading(false);
        setError(true);
      }
    }, 7000);

    const fetchOverview = async () => {
      try {
        const flag = await getAIOverviewFeatureFlag();
        if (!isMounted) return;
        setIsFeatureEnabled(flag);

        if (!flag) {
          setLoading(false);
          setIsInitialLoading(false);
          return;
        }

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
          if (onCitationsLoadedRef.current && data.citations) {
            onCitationsLoadedRef.current(data.citations);
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
          setIsInitialLoading(false);
          clearTimeout(timeoutTimer);
        }
      }
    };

    fetchOverview();

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutTimer);
    };
  }, [trimmed, enabled, retryCount]);

  const handleFeedback = useCallback(
    async (vote: 'up' | 'down') => {
      if (!overview || isVoting || !trimmed) return;

      // Clicking the already-active thumb toggles it off (undo), clicking the other switches the vote
      const nextVote: 'up' | 'down' | null = hasVoted === vote ? null : vote;

      setIsVoting(true);
      try {
        const sessionId = getFeedbackSessionId();
        const isHelpful = nextVote === null ? null : nextVote === 'up';

        const { error } = await (supabase.rpc as any)("submit_ai_overview_feedback", {
          p_query: trimmed,
          p_response: overview,
          p_is_helpful: isHelpful,
          p_session_id: sessionId,
        });

        if (error) throw error;

        setHasVoted(nextVote);
        if (nextVote === 'up') {
          toast.success("Thank you for the feedback!");
        } else if (nextVote === 'down') {
          toast.success("Feedback recorded. We will improve this.");
        } else {
          toast.success("Feedback removed.");
        }
      } catch (err) {
        console.error("Failed to submit feedback:", err);
        toast.error("Could not record feedback.");
      } finally {
        setIsVoting(false);
      }
    },
    [overview, hasVoted, isVoting, trimmed]
  );

  return {
    overview,
    loading,
    isInitialLoading,
    error,
    isFeatureEnabled,
    hasVoted,
    isVoting,
    retry: handleRetry,
    handleFeedback,
  };
}
