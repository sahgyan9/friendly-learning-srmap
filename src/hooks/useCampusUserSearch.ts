import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { searchCampusUsers, CampusUserResult } from "@/integrations/supabase/services/chat/user.service";

interface UseCampusUserSearchOptions {
  /** Fetch suggested users even when the query is empty (default: false). */
  searchOnEmpty?: boolean;
  /** Debounce delay in ms for a non-empty query (default: 220). */
  debounceMs?: number;
  /** Pause fetching entirely, e.g. while a containing modal is closed. */
  enabled?: boolean;
}

/**
 * Debounced campus-user search with a request-id guard against out-of-order
 * responses clobbering a fresher one. Was previously duplicated, nearly
 * verbatim, in both ConversationList.tsx and NewConversationModal.tsx — the
 * two copies had already begun to drift (different debounce timings).
 */
export function useCampusUserSearch(
  query: string,
  currentUserId: string | undefined,
  options: UseCampusUserSearchOptions = {},
) {
  const { searchOnEmpty = false, debounceMs = 220, enabled = true } = options;
  const trimmedNow = query.trim();
  const debouncedQuery = useDebounce(query, trimmedNow ? debounceMs : 0);
  const [results, setResults] = useState<CampusUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const requestIdRef = useRef(0);

  // Immediate feedback while typing: clear stale results / show the spinner
  // right away, without waiting for the debounce below to settle.
  useEffect(() => {
    if (!enabled) return;
    if (!trimmedNow && !searchOnEmpty) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
  }, [trimmedNow, searchOnEmpty, enabled]);

  // Debounced fetch, keyed only off the debounced query / currentUserId.
  useEffect(() => {
    if (!enabled) return;
    const trimmed = debouncedQuery.trim();
    if (!trimmed && !searchOnEmpty) return;

    const requestId = ++requestIdRef.current;
    (async () => {
      try {
        const users = await searchCampusUsers(trimmed, currentUserId);
        if (requestIdRef.current === requestId) {
          setResults(users);
        }
      } catch (err) {
        console.error("Campus user search failed:", err);
        if (requestIdRef.current === requestId) {
          setResults([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    })();
  }, [debouncedQuery, currentUserId, searchOnEmpty, enabled]);

  return { results, isSearching };
}
