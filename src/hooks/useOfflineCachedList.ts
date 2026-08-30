import { useCallback, useEffect, useRef, useState } from "react";
import { getOfflineCache, setOfflineCache } from "@/lib/offline/offlineStorage";

interface FetchResult<T> {
  data: T[] | null;
  error?: unknown;
}

function readCache<T>(key: string | null) {
  return key ? getOfflineCache<T[]>(key) : null;
}

interface UseOfflineCachedListOptions<T> {
  /** Offline cache storage key. Pass null to skip caching (e.g. dependency not resolved yet). */
  cacheKey: string | null;
  /** Performs the live fetch. Re-run whenever this or `cacheKey` changes identity, so callers
   *  should wrap it in `useCallback` with the query params it depends on. */
  fetcher: () => Promise<FetchResult<T>>;
  /** Whether a successful fetch should be persisted to the offline cache. Defaults to true —
   *  pass false to skip caching filtered/searched results and only cache the canonical list. */
  shouldCache?: boolean;
}

/**
 * Cache-first list fetching, standardized across every page that shows saved
 * data while offline (Opportunities, Communities, the campus feed widget).
 *
 * This exists because five call sites hand-rolled the same "read cache into
 * initial state, skip the network fetch when offline, write the response back
 * to cache" logic, and two of them did it with `items.length` in a `useCallback`
 * dependency array — which changes the callback's identity the moment the fetch
 * resolves with a different count, which re-fires the `useEffect` that calls it,
 * which fetches again. Not infinite, but every page load did two network
 * requests instead of one. A third and fourth call site only wrote a fresh
 * result into state when it was non-empty, so a search or filter that
 * legitimately matched nothing kept showing the previous (unrelated) cached
 * list forever instead of an empty state.
 *
 * Also adds the one thing none of the original call sites did: refetch when
 * the browser's `online` event fires, so a cached/stale view updates itself
 * once connectivity returns instead of waiting for a manual pull-to-refresh.
 */
export function useOfflineCachedList<T>({
  cacheKey,
  fetcher,
  shouldCache = true,
}: UseOfflineCachedListOptions<T>) {
  const [items, setItems] = useState<T[]>(() => {
    const cached = readCache<T>(cacheKey);
    return cached?.data && Array.isArray(cached.data) ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = readCache<T>(cacheKey);
    return !(cached?.data && Array.isArray(cached.data) && cached.data.length > 0);
  });
  const [cachedAt, setCachedAt] = useState<number | null>(() => readCache<T>(cacheKey)?.savedAt ?? null);

  // Refs so `refetch` can stay referentially stable (empty dep array) while
  // still always calling the latest fetcher/cacheKey/shouldCache — this is
  // what avoids the effect-loop bug described above.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const shouldCacheRef = useRef(shouldCache);
  shouldCacheRef.current = shouldCache;
  const inFlight = useRef(false);

  const refetch = useCallback(async () => {
    if (inFlight.current) return;

    const cached = readCache<T>(cacheKeyRef.current);
    const hasCachedData = Boolean(cached?.data && Array.isArray(cached.data) && cached.data.length > 0);
    if (hasCachedData) {
      setItems(cached!.data);
      setCachedAt(cached!.savedAt);
      setLoading(false);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    if (!hasCachedData) setLoading(true);
    inFlight.current = true;

    try {
      const { data, error } = await fetcherRef.current();
      // A successful response is authoritative, including a genuinely empty
      // array — only a request that actually failed should leave the cached
      // view standing.
      if (!error && data) {
        setItems(data);
        if (shouldCacheRef.current && cacheKeyRef.current) {
          setOfflineCache(cacheKeyRef.current, data);
          setCachedAt(Date.now());
        }
      }
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, fetcher]);

  useEffect(() => {
    window.addEventListener("online", refetch);
    return () => window.removeEventListener("online", refetch);
  }, [refetch]);

  return { items, setItems, loading, cachedAt, refetch };
}
