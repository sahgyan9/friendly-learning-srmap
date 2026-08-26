
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  Notification
} from "@/integrations/supabase/services/notifications";
import NotificationItem from "./NotificationItem";
import { OPEN_NOTIFICATIONS_EVENT } from "@/lib/search/events";

/** Coalesces a burst of realtime events (e.g. "mark all read" touching many rows) into one refetch. */
const SETTLE_MS = 250;

const NotificationBell = () => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading: pushLoading, enablePush, permission } = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const userId = user?.id ?? null;
  // Guards every setState so a response landing after sign-out/unmount can't
  // resurrect stale state.
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [notificationsResult, unreadResult] = await Promise.all([
        getUserNotifications(userId),
        getUnreadNotificationsCount(userId)
      ]);

      if (!activeRef.current) return;

      if (notificationsResult.data) {
        setNotifications(notificationsResult.data);
      }
      if (unreadResult.data !== null) {
        setUnreadCount(unreadResult.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [userId]);

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
      timerRef.current = setTimeout(fetchNotifications, SETTLE_MS);
    };

    fetchNotifications();

    // Treats every realtime event purely as "go look again" rather than
    // patching state from the payload — see subscribeToNotifications for why.
    const unsubscribe = subscribeToNotifications(userId, refresh);

    // Catches a read made on another tab/device without waiting on realtime.
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
  }, [userId, fetchNotifications]);

  // Searching for "notifications" opens this popover. There is no notifications
  // page to navigate to, so the search result asks the bell to open instead.
  useEffect(() => {
    const openFromSearch = () => setIsOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, openFromSearch);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, openFromSearch);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;

    try {
      await markAllNotificationsAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (!user) return null;

  const showPushDot = unreadCount === 0 && !isSubscribed && isSupported && permission !== "denied";

  const bellAriaLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : showPushDot
    ? "Notifications (Push alerts disabled)"
    : "Notifications";

  const bellTitle = unreadCount > 0
    ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
    : showPushDot
    ? "Notifications • Enable push alerts"
    : "Notifications";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {/* Filled circle to match MessagesIcon and the avatar beside it — see
            the note there on why these three share a shape, and on why the
            badge uses a ring rather than a border under the header's blur. */}
        <button
          type="button"
          aria-label={bellAriaLabel}
          title={bellTitle}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isOpen
              ? "bg-primary/15 text-primary"
              : "bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-semibold leading-none text-destructive-foreground ring-2 ring-background"
              aria-hidden
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : showPushDot ? (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary ring-2 ring-background"></span>
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] p-0 shadow-xl border-border/80" align="end">
        <div className="p-3.5 px-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        {!isSubscribed && isSupported && (
          <div className="bg-primary/10 border-b border-primary/20 px-3.5 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="h-4 w-4 text-primary shrink-0 animate-pulse" />
              <span className="text-xs text-foreground/90 font-medium truncate">
                Get browser push alerts
              </span>
            </div>
            <Button
              size="sm"
              variant="default"
              className="h-6 px-2.5 text-2xs font-semibold shrink-0"
              disabled={pushLoading}
              onClick={enablePush}
            >
              {pushLoading ? "Enabling..." : "Enable"}
            </Button>
          </div>
        )}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onNotificationClick={() => setIsOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
