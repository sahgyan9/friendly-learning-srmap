import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getUnreadNotificationsCount,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
  type Notification,
} from "@/integrations/supabase/services/notifications";

/** Coalesces a burst of realtime events (e.g. "mark all read" touching many rows) into one refetch. */
const SETTLE_MS = 250;

interface UseNotificationsOptions {
  /**
   * Whether to fetch the notification list, not just the unread count.
   *
   * The bottom dock needs the count on every page load but the list only once
   * someone opens the panel, so it passes the panel's open state here and the
   * list is fetched at that moment. The header bell passes nothing and keeps
   * its prefetch, because its popover is expected to open instantly.
   */
  includeList?: boolean;
}

/**
 * The notification list and unread count behind both the header bell and the
 * mobile dock's alerts panel.
 *
 * This was the bell's own component state until the dock needed the same
 * count. Two copies of "fetch, subscribe, refetch on focus" would have drifted
 * the way the message badge did — see {@link useUnreadMessages} for what that
 * looked like — so the logic lives here and both surfaces render the same
 * numbers.
 *
 * Realtime events are treated purely as a signal to look again; the count and
 * the list always come from a query. Any drift is corrected by the next
 * refresh, and four things trigger one: a realtime change on this user's
 * notifications, the tab becoming visible, the window regaining focus, and
 * `includeList` flipping on.
 */
export const useNotifications = ({ includeList = true }: UseNotificationsOptions = {}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const userId = user?.id ?? null;
  // Guards every setState so a response landing after sign-out or unmount
  // cannot resurrect stale state.
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [listResult, unreadResult] = await Promise.all([
        includeList ? getUserNotifications(userId) : Promise.resolve(null),
        getUnreadNotificationsCount(userId),
      ]);

      if (!activeRef.current) return;

      if (listResult?.data) {
        setNotifications(listResult.data);
      }
      if (unreadResult.data !== null) {
        setUnreadCount(unreadResult.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [userId, includeList]);

  useEffect(() => {
    activeRef.current = true;

    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return () => {
        activeRef.current = false;
      };
    }

    const refresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(refetch, SETTLE_MS);
    };

    refetch();

    const unsubscribe = subscribeToNotifications(userId, refresh);

    // Catches a read made on another tab or device without waiting on realtime.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
    };
  }, [userId, refetch]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [userId]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};

export default useNotifications;
