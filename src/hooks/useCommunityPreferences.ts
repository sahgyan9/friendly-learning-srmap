import { useCallback, useState } from "react";

const PINNED_STORAGE_KEY = "fl_pinned_communities";
const LAST_READ_STORAGE_KEY = "fl_communities_last_read";

export function useCommunityPreferences() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PINNED_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [lastReadMap, setLastReadMap] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(LAST_READ_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const togglePin = useCallback((communityId: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(communityId)
        ? prev.filter((id) => id !== communityId)
        : [...prev, communityId];
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (communityId: string) => pinnedIds.includes(communityId),
    [pinnedIds],
  );

  const markCommunityRead = useCallback((communityId: string) => {
    const now = Date.now();
    setLastReadMap((prev) => {
      const next = { ...prev, [communityId]: now };
      try {
        localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  }, []);

  const hasUnread = useCallback(
    (communityId: string, lastActivityAt?: string | null) => {
      if (!lastActivityAt) return false;
      const lastRead = lastReadMap[communityId] ?? 0;
      const activityTime = new Date(lastActivityAt).getTime();
      return activityTime > lastRead;
    },
    [lastReadMap],
  );

  return {
    pinnedIds,
    togglePin,
    isPinned,
    markCommunityRead,
    hasUnread,
  };
}
