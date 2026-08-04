import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "fl:seen:";

/**
 * Tracks whether this browser has seen a newly shipped feature.
 *
 * Deliberately localStorage rather than a database flag: it needs to work for
 * signed-out first-time visitors, who are exactly the people the announcement
 * is for. Bump the key when a feature changes enough to re-announce.
 */
export function useFeatureSeen(featureKey: string) {
  const storageKey = `${STORAGE_PREFIX}${featureKey}`;

  // Starts as `true` so the badge never flashes during hydration/SSR; the effect
  // flips it to false on the client if the feature really is unseen.
  const [hasSeen, setHasSeen] = useState(true);

  useEffect(() => {
    try {
      setHasSeen(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // Private mode or storage disabled — treat as seen and stay quiet.
      setHasSeen(true);
    }
  }, [storageKey]);

  const markSeen = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore: failing to persist just means the hint shows again.
    }
    setHasSeen(true);
  }, [storageKey]);

  return { hasSeen, markSeen };
}

export const FACULTY_RATINGS_FEATURE = "faculty-ratings-v1";

export function useHasSeenFacultyRatings() {
  return useFeatureSeen(FACULTY_RATINGS_FEATURE);
}

/**
 * Distinct from the announcement above: these mark whether someone has ever
 * visited the page itself, so the welcome tour's navbar dot ("here's where
 * that lives") can clear per-item as they actually go find each thing,
 * rather than all four dots vanishing together.
 */
export const GROUPS_NAV_FEATURE = "nav-visited-groups-v1";
export const EVENTS_NAV_FEATURE = "nav-visited-events-v1";
export const MENTORS_NAV_FEATURE = "nav-visited-mentors-v1";

export function useHasVisitedGroupsNav() {
  return useFeatureSeen(GROUPS_NAV_FEATURE);
}

export function useHasVisitedEventsNav() {
  return useFeatureSeen(EVENTS_NAV_FEATURE);
}

export function useHasVisitedMentorsNav() {
  return useFeatureSeen(MENTORS_NAV_FEATURE);
}
