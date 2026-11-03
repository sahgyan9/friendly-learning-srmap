
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
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

  /**
   * Offer push only when the browser can still act on it. A permission the
   * visitor has already declined cannot be re-requested from script, so an
   * Enable button in that state is inert — it was shown anyway until the dock
   * grew a panel of its own and the two surfaces had to agree.
   */
  const canOfferPush = isSupported && !isSubscribed && permission !== "denied";

  const showPushDot = unreadCount === 0 && canOfferPush;

  const bellAriaLabel = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : showPushDot
    ? "Notifications, push alerts off"
    : "Notifications";

  const bellTitle = unreadCount > 0
    ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
    : showPushDot
    ? "Notifications. Push alerts are off"
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
              className="tabular absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-semibold leading-none text-destructive-foreground ring-2 ring-background"
              aria-hidden
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : showPushDot ? (
            // A static dot: push being off is a setting, not news, so it
            // should not compete with a real unread ping for attention.
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" aria-hidden />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] p-0 shadow-float" align="end">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <h3 className="flex items-baseline gap-2 text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="tabular text-xs font-normal text-muted-foreground">{unreadCount} unread</span>
            )}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="-mr-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </Button>
          )}
        </div>
        {canOfferPush && (
          <div className="flex items-center justify-between gap-2 border-b bg-secondary/60 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <BellRing className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate text-xs text-foreground">
                Get alerts even when this tab is closed
              </span>
            </div>
            <Button
              size="sm"
              className="h-8 shrink-0 px-3 text-xs"
              isLoading={pushLoading}
              onClick={enablePush}
            >
              Turn on
            </Button>
          </div>
        )}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="divide-y" aria-busy="true" aria-label="Loading notifications">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-4">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <BellOff className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground">Replies, RSVP reminders and group invites will show up here.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
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
