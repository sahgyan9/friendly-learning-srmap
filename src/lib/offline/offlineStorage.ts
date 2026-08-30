/**
 * Client-Side Offline Storage Utility for Friendly Learning SRMAP.
 * Provides safe JSON caching in localStorage with timestamp metadata,
 * error resilience, and formatted relative timestamps for offline display.
 */

const STORAGE_PREFIX = "fl_offline_cache:";

export interface CachedData<T> {
  data: T;
  savedAt: number;
}

export function getOfflineCache<T>(key: string): CachedData<T> | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "data" in parsed && "savedAt" in parsed) {
      return parsed as CachedData<T>;
    }

    // Handle legacy raw values without metadata
    return {
      data: parsed as T,
      savedAt: Date.now(),
    };
  } catch (error) {
    console.warn(`[offlineStorage] Failed to read cached data for key "${key}":`, error);
    return null;
  }
}

export function setOfflineCache<T>(key: string, data: T): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return false;
  }

  try {
    const payload: CachedData<T> = {
      data,
      savedAt: Date.now(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn(`[offlineStorage] Failed to cache data for key "${key}":`, error);
    return false;
  }
}

export function clearOfflineCache(key: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // Ignore clear errors
  }
}

/**
 * Formats a saved timestamp into a friendly relative/absolute label.
 * Example: "Just now", "5m ago", "Today at 2:30 PM", "Yesterday at 11:00 AM", or "28 Aug at 4:15 PM"
 */
export function formatOfflineTime(timestamp: number): string {
  if (!timestamp) return "earlier";

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 6) {
    return `${diffHour}h ago`;
  }

  const date = new Date(timestamp);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${dateStr} at ${timeStr}`;
}
