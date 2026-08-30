
import { useEffect, useState } from "react";
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
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotificationItem from "./NotificationItem";
import { OPEN_NOTIFICATIONS_EVENT } from "@/lib/search/events";

/**
 * The header's notification bell.
 *
 * Fetching, the realtime subscription and the read/unread writes all moved to
 * {@link useNotifications} when the mobile dock grew an alerts panel of its
 * own — two surfaces showing one number should not each maintain their own
 * copy of how that number is kept current.
 *
 * `className` is how the header hides this on mobile, where the dock's panel
 * takes over.
 */
const NotificationBell = ({ className }: { className?: string }) => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading: pushLoading, enablePush, permission } = usePushNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Searching for "notifications" opens this popover. There is no notifications
  // page to navigate to, so the search result asks the bell to open instead.
  useEffect(() => {
    const openFromSearch = () => setIsOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, openFromSearch);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, openFromSearch);
  }, []);

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
            className,
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
                onClick={markAllAsRead}
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
              className="relative h-6 px-2.5 text-2xs font-semibold shrink-0"
              disabled={pushLoading}
              onClick={enablePush}
            >
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5" aria-hidden>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary ring-2 ring-background"></span>
              </span>
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
                  onMarkAsRead={markAsRead}
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
