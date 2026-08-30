import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Menu, Moon, Sun, X } from "lucide-react";

import NavbarProfileMenu from "@/components/NavbarProfileMenu";
import NotificationItem from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useCollapseOnScroll } from "@/hooks/useCollapseOnScroll";
import {
  useHasSeenFacultyRatings,
  useHasVisitedEventsNav,
  useHasVisitedGroupsNav,
  useHasVisitedMentorsNav,
} from "@/hooks/useFeatureAnnouncement";
import { useNotifications } from "@/hooks/useNotifications";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { rankNavSections, recordNavVisit } from "@/lib/nav-usage";
import { toggleTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  type NavItem,
  PRIMARY_NAV,
  ROUTE_ACCENT,
  SECONDARY_NAV,
  isActivePath,
  pathShowsDock,
} from "./nav-config";

/**
 * The two links that never move.
 *
 * Home anchors the left end, and Messages sits beside it for anyone signed in
 * because it is the one link here with a number attached — a count you have to
 * open a sheet to find is a count nobody sees. Everything else rotates, and
 * things that rotate need somewhere fixed to rotate around.
 */
const PINNED_SECTIONS = ["/", "/messages"];

/**
 * The pool the remaining slots are drawn from, in the order a new install
 * gets them. After that the order is this device's own — see
 * {@link rankNavSections}. The list order still decides ties, so a phone that
 * has only ever opened Home comes out exactly as written here.
 */
const ROTATING_SECTIONS = [
  "/workspace-groups",
  "/faculty",
  "/events",
  "/posts",
  "/mentors",
];

/**
 * Six buttons is what fits at 360px without the labels colliding — measured,
 * not guessed. Signed in, one of the six goes to Alerts, so a signed-in dock
 * has one fewer link than a signed-out one.
 */
const MAX_DOCK_BUTTONS = 6;

export function MobileNavDock() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const unreadCount = useUnreadMessages();
  // The list is only worth fetching once the panel is actually open; the count
  // behind the badge is fetched either way.
  const {
    notifications,
    unreadCount: unreadNotifications,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ includeList: alertsOpen });

  const moreSwipe = useSwipeToDismiss(() => setSheetOpen(false));
  const alertsSwipe = useSwipeToDismiss(() => setAlertsOpen(false));

  /**
   * Frozen for the life of the mount on purpose.
   *
   * The ranking is read once, not recomputed as you navigate, because the
   * visit you are making right now would otherwise re-sort the dock under your
   * thumb — you would tap Faculty, and Faculty would move. Reshuffling on the
   * next load is late enough to feel like the app learning, and early enough
   * to be worth having.
   */
  const [rankedSections] = useState(() => rankNavSections(ROTATING_SECTIONS));

  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const { hasSeen: hasVisitedGroups } = useHasVisitedGroupsNav();
  const { hasSeen: hasVisitedEvents } = useHasVisitedEventsNav();
  const { hasSeen: hasVisitedMentors } = useHasVisitedMentorsNav();

  // Highlight dots for new or unvisited features
  const tourCompleted = profile?.has_seen_welcome_tour === true;
  const navHighlights: Record<string, boolean> = {
    "/workspace-groups": tourCompleted && !hasVisitedGroups,
    "/events": tourCompleted && !hasVisitedEvents,
    "/mentors": tourCompleted && !hasVisitedMentors,
    "/faculty": !hasSeenFaculty,
  };

  /**
   * The link slots: pinned first, then this device's most-used sections.
   *
   * The active section is always one of them. Without that, opening a
   * destination that lives in the sheet — /mentors, say — left the whole dock
   * unlit, which reads as "you are nowhere". When it is not already in the
   * list it takes the last slot rather than being inserted near the front, so
   * the items someone reaches for by muscle memory keep their positions.
   */
  const dockItems = useMemo(() => {
    const byUrl = new Map(PRIMARY_NAV.map((item) => [item.url, item]));
    const available = [...PINNED_SECTIONS, ...rankedSections]
      .map((url) => byUrl.get(url))
      .filter((item): item is NavItem => Boolean(item))
      .filter((item) => !item.requiresAuth || Boolean(user));

    // Alerts and More are buttons, not links, and both are always present for
    // a signed-in student; the links get whatever is left.
    const linkSlots = MAX_DOCK_BUTTONS - (user ? 2 : 1);

    const slots = available.slice(0, linkSlots);
    const activeItem = available.find(
      (item) => item.url !== "/" && isActivePath(location.pathname, item.url),
    );
    if (activeItem && !slots.some((slot) => slot.url === activeItem.url)) {
      slots[slots.length - 1] = activeItem;
    }
    return slots;
  }, [user, location.pathname, rankedSections]);

  // Close both sheets on route changes
  useEffect(() => {
    setSheetOpen(false);
    setAlertsOpen(false);
  }, [location.pathname]);

  // Feeds the ranking above. Recorded for every section, including the ones
  // that are never dock candidates, so the store stays a truthful record of
  // where this device goes rather than a record of what the dock offered.
  useEffect(() => {
    const visited = PRIMARY_NAV.find(
      (item) => item.url !== "/" && isActivePath(location.pathname, item.url),
    );
    if (visited) recordNavVisit(visited.url);
  }, [location.pathname]);

  // Slides the dock below the safe area on scroll-down, back up on scroll-up
  // — same pattern as SiteHeader, but simpler: this dock is `fixed`, not
  // `sticky`, so it never occupies flow space and hiding it needs no
  // coordination with surrounding layout. collapsibleHeight is 0 (not the
  // dock's own height) because hiding it doesn't shorten the document the
  // way collapsing a sticky element does.
  const dockHidden = useCollapseOnScroll(96, 0);

  // Only render on routes where the mobile dock belongs
  if (!pathShowsDock(location.pathname)) {
    return null;
  }

  const isActive = (url: string) => isActivePath(location.pathname, url);

  // Remaining primary items to show in the "More" bottom sheet
  const morePrimaryItems = PRIMARY_NAV.filter(
    (item) =>
      !dockItems.some((dockItem) => dockItem.url === item.url) &&
      (!item.requiresAuth || user),
  );

  // Unread messages are announced once: on the dock's Messages slot when it
  // has one, on the More button when Messages has been pushed into the sheet.
  const messagesDocked = dockItems.some((item) => item.url === "/messages");
  const moreUnread = messagesDocked ? 0 : unreadCount;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] px-4 lg:hidden",
        "transition-transform duration-300 ease-in-out",
        dockHidden && !sheetOpen && !alertsOpen
          ? "translate-y-[150%]"
          : "translate-y-0",
      )}
      aria-label="Mobile Navigation"
    >
      <nav
        aria-label="Mobile Quick Nav"
        className={cn(
          "pointer-events-auto flex items-center justify-between gap-1 w-full max-w-sm sm:max-w-md",
          "rounded-full px-3 py-2 border shadow-lg backdrop-blur-xl transition-all duration-300",
          "bg-background/90 dark:bg-background/85 border-border/80 dark:border-border/60",
          "shadow-black/5 dark:shadow-black/20",
        )}
      >
        {dockItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url);
          const highlighted = navHighlights[item.url];
          const itemAccent = ROUTE_ACCENT[item.url] ?? ROUTE_ACCENT["/"];
          const count = item.url === "/messages" ? unreadCount : 0;

          return (
            <Link
              key={item.url}
              to={item.url}
              aria-label={count > 0 ? `${item.name}, ${count} unread` : item.name}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center py-1 rounded-full transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? `${itemAccent.pill} ${itemAccent.text}`
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon className="h-5 w-5 transition-transform active:scale-90" aria-hidden />
                {count > 0 ? (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-semibold leading-none text-destructive-foreground ring-2 ring-background"
                    aria-hidden
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : (
                  highlighted && (
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background",
                        itemAccent.dot,
                      )}
                      aria-hidden
                    />
                  )
                )}
              </div>
              <span className="max-w-full truncate text-3xs font-medium tracking-tight mt-0.5">
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Alerts. A panel rather than a link, because notifications have no
            page of their own — and a bottom sheet rather than the header
            bell's popover, which would be anchored to a bar that has scrolled
            away by the time a thumb reaches the dock. */}
        {user && (
          <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={
                  unreadNotifications > 0
                    ? `Alerts, ${unreadNotifications} unread`
                    : "Alerts"
                }
                aria-expanded={alertsOpen}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center py-1 rounded-full transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  alertsOpen
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Bell className="h-5 w-5 transition-transform active:scale-90" aria-hidden />
                  {unreadNotifications > 0 && (
                    <span
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-semibold leading-none text-destructive-foreground ring-2 ring-background"
                      aria-hidden
                    >
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </div>
                <span className="max-w-full truncate text-3xs font-medium tracking-tight mt-0.5">
                  Alerts
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              ref={alertsSwipe.scrollerRef}
              style={alertsSwipe.style}
              {...alertsSwipe.handlers}
              className="rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain p-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-border/80 bg-background/95 backdrop-blur-xl"
            >
              <div className="sticky top-0 z-10 flex flex-col items-center pt-3 pb-2 bg-background/95 backdrop-blur">
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25 mb-2" />
                <div className="flex w-full items-center justify-between px-6">
                  <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
                  {unreadNotifications > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Mark all read
                    </Button>
                  ) : (
                    <SheetClose className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </SheetClose>
                  )}
                </div>
              </div>

              {notificationsLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onNotificationClick={() => setAlertsOpen(false)}
                    />
                  ))}
                </div>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Last slot: everything the rotation did not fit */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={
                moreUnread > 0
                  ? `More navigation options, ${moreUnread} unread messages`
                  : "More navigation options"
              }
              aria-expanded={sheetOpen}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center py-1 rounded-full transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sheetOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <div className="relative flex items-center justify-center">
                <Menu className="h-5 w-5 transition-transform active:scale-90" aria-hidden />
                {moreUnread > 0 ? (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-3xs font-semibold leading-none text-destructive-foreground ring-2 ring-background"
                    aria-hidden
                  >
                    {moreUnread > 99 ? "99+" : moreUnread}
                  </span>
                ) : (
                  /* Dot indicator if any hidden item has an unviewed highlight */
                  Object.entries(navHighlights).some(
                    ([path, isHighlighted]) =>
                      isHighlighted && !dockItems.some((i) => i.url === path),
                  ) && (
                    <span
                      className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
                      aria-hidden
                    />
                  )
                )}
              </div>
              <span className="text-3xs font-medium tracking-tight mt-0.5">
                More
              </span>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            ref={moreSwipe.scrollerRef}
            style={moreSwipe.style}
            {...moreSwipe.handlers}
            className="rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain p-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-border/80 bg-background/95 backdrop-blur-xl"
          >
            {/* Drag Handle Pill */}
            <div className="sticky top-0 z-10 flex flex-col items-center pt-3 pb-2 bg-background/95 backdrop-blur">
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25 mb-2" />
              <div className="flex w-full items-center justify-between px-6">
                <SheetTitle className="text-base font-semibold">Explore & Menu</SheetTitle>
                <SheetClose className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
            </div>

            <div className="px-5 space-y-4 pt-1">
              {/* Additional Core Destinations */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Community & People
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {morePrimaryItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.url);
                    const highlighted = navHighlights[item.url];
                    const itemAccent = ROUTE_ACCENT[item.url] ?? ROUTE_ACCENT["/"];

                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl p-3 text-sm font-medium border transition-all",
                          active
                            ? `${itemAccent.pill} ${itemAccent.text} border-transparent shadow-sm`
                            : "bg-muted/40 hover:bg-muted text-foreground/90 border-border/50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            active ? "bg-background/80 shadow-xs" : "bg-background",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{item.name}</span>
                            {highlighted && (
                              <span
                                className={cn("h-1.5 w-1.5 rounded-full shrink-0", itemAccent.dot)}
                                aria-hidden
                              />
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Secondary Navigation Links */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Resources & Info
                </span>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {SECONDARY_NAV.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <Link
                        key={item.url}
                        to={item.url}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Theme Toggle Strip */}
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border border-border/40">
                <span className="text-sm font-medium">Appearance</span>
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className="flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 text-xs font-medium shadow-xs border border-border/60 hover:bg-muted transition-colors"
                >
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center" aria-hidden>
                    <Sun className="absolute h-3.5 w-3.5 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 text-yellow-400 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
                  </span>
                  <span className="dark:hidden">Dark Mode</span>
                  <span className="hidden dark:inline">Light Mode</span>
                </button>
              </div>

              {/* Account / Auth Actions */}
              <div className="pt-1">
                {user ? (
                  <div className="rounded-xl border border-border/60 p-2 bg-muted/20">
                    <NavbarProfileMenu />
                  </div>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/signin" state={{ from: location }}>
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}

export default MobileNavDock;
