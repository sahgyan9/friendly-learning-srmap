import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";

import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import NavbarProfileMenu from "@/components/NavbarProfileMenu";
import MessagesIcon from "@/components/navbar/MessagesIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import SiteSearch from "@/components/search/SiteSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import {
  useHasSeenFacultyRatings,
  useHasVisitedEventsNav,
  useHasVisitedGroupsNav,
  useHasVisitedMentorsNav,
} from "@/hooks/useFeatureAnnouncement";
import { cn } from "@/lib/utils";
import {
  PRIMARY_NAV,
  ROUTE_ACCENT,
  SECONDARY_NAV,
  accentFor,
  isActivePath,
} from "./nav-config";

/**
 * The site's top bar: one 64px row, three blocks.
 *
 * Left is identity and search, together, because search is the thing people
 * reach for second after the logo. Centre is the primary nav as bare icons.
 * Right is messages, notifications and the account.
 *
 * The two side blocks are both `flex-1` with a zero basis, so they resolve to
 * equal widths whatever they contain and the centre block lands on the true
 * middle of the viewport. Sizing them by content instead would drift the icons
 * left or right as the account cluster changes between signed-out (two
 * buttons) and signed-in (three icons and an avatar).
 *
 * This replaced a two-row header. The old second row held the same links as
 * text and collapsed on scroll, which meant that on the pages you actually
 * scroll, the navigation was gone by the time you wanted it. Those links now
 * live in two always-visible places: these icons, and SiteRail down the left
 * with their labels. All three surfaces render PRIMARY_NAV from nav-config, so
 * there is still one list.
 *
 * Below `lg` there are no centre icons and no rail — there is no width for
 * either — and the sheet is the whole navigation, which was never the crowded
 * case.
 */
export function SiteHeader() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const accent = accentFor(location.pathname);
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const { hasSeen: hasVisitedGroups } = useHasVisitedGroupsNav();
  const { hasSeen: hasVisitedEvents } = useHasVisitedEventsNav();
  const { hasSeen: hasVisitedMentors } = useHasVisitedMentorsNav();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Points at where a feature lives in the nav until someone's found it.
  // Groups/Events/Mentors only light up once the welcome tour has actually
  // shown them the feature; Faculty ratings is its own standalone
  // announcement and lights up for everyone regardless of the tour.
  const tourCompleted = profile?.has_seen_welcome_tour === true;
  const navHighlights: Record<string, boolean> = {
    "/communities": tourCompleted && !hasVisitedGroups,
    "/marketplace": tourCompleted && !hasVisitedEvents,
    "/mentors": tourCompleted && !hasVisitedMentors,
    "/faculty": !hasSeenFaculty,
  };

  // Route changes must close the sheet, or tapping a link leaves the overlay
  // covering the page you just navigated to.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (url: string) => isActivePath(location.pathname, url);
  const visibleNav = PRIMARY_NAV.filter((item) => !item.requiresAuth || user);

  /**
   * The centre row, minus Messages.
   *
   * MessagesIcon already sits in the account cluster a few hundred pixels to
   * the right, and it is the better of the two: it carries the unread count.
   * Rendering the nav entry as well put two icons for the same destination in
   * one 64px bar, one of them silently wrong about whether anything was
   * waiting. Messages keeps its place in the rail and the sheet, where there
   * is no cluster to collide with.
   */
  const centreNav = visibleNav.filter((item) => item.url !== "/messages");

  return (
    <>
      {/* Keyboard users can jump the nav instead of tabbing every link on
          every page. Invisible until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 transition-colors duration-300",
          accent.border,
        )}
      >
        <div className="flex h-16 items-center gap-2 px-3 sm:px-4">
          {/* Left: identity and search. shrink-0 on both children — the mark
              and the search trigger each have a floor, and letting flexbox
              take it out of them is what used to scroll a 360px phone
              sideways. */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link
              to="/"
              className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Wordmark between `sm` and `lg` only. From `lg` the centre
                  icons appear and the left block has to end before the middle
                  of the viewport; 245px of wordmark plus a search field does
                  not. Dropping the words is also what Facebook does, and for
                  the same reason — the search field is what wants that space. */}
              <Logo textClassName="hidden sm:flex lg:hidden" />
            </Link>
            <div className="shrink-0">
              <SiteSearch />
            </div>
          </div>

          {/* Centre: the primary nav as icons only. Labels for these live in
              the rail; here they are tooltips and aria-labels, which is the
              whole reason this block fits in one row. */}
          <nav aria-label="Primary" className="hidden shrink-0 items-center lg:flex">
            <ul className="flex items-center">
              {centreNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.url);
                const highlighted = navHighlights[item.url];
                const itemAccent = ROUTE_ACCENT[item.url] ?? ROUTE_ACCENT["/"];

                return (
                  <li key={item.url}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.url}
                          aria-label={item.name}
                          aria-current={active ? "page" : undefined}
                          className="relative flex h-16 w-16 items-center justify-center xl:w-20"
                        >
                          {/* The hover target is this inset rectangle rather
                              than the full 64px cell, so hovering never paints
                              a block that touches the header's own border. */}
                          <span
                            className={cn(
                              "flex h-11 w-full items-center justify-center rounded-lg transition-colors",
                              active ? itemAccent.pill : "hover:bg-muted",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-6 w-6 transition-colors",
                                active ? itemAccent.text : "text-muted-foreground",
                              )}
                              aria-hidden
                            />
                          </span>

                          {highlighted && (
                            <span
                              className={cn(
                                "absolute right-2.5 top-2.5 h-2 w-2 rounded-full xl:right-4",
                                itemAccent.dot,
                              )}
                              aria-hidden
                            />
                          )}

                          {/* Sits on the header's bottom border, the way a
                              tab indicator should. -bottom-px covers the
                              border itself rather than stacking above it. */}
                          {active && (
                            <span
                              className={cn(
                                "absolute inset-x-0 -bottom-px h-[3px] rounded-full",
                                itemAccent.dot,
                              )}
                              aria-hidden
                            />
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{item.name}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right: account. Matches the left block's flex-1 so the centre
              stays centred. */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
            {user ? (
              <>
                <MessagesIcon />
                <NotificationBell />
                <div className="hidden lg:block">
                  <NavbarProfileMenu />
                </div>
              </>
            ) : (
              <>
                {/* Signed out there is no rail on the auth pages this leads
                    to, and no profile menu to hang the theme toggle off, so
                    it stays in the bar. Signed in it lives in the rail. */}
                <div className="lg:hidden">
                  <DarkModeToggle />
                </div>
                <div className="hidden items-center gap-2 lg:flex">
                  {/* `state.from` returns the visitor to the page they were
                      on rather than dropping them on the homepage. */}
                  <Link to="/signin" state={{ from: location }}>
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">Sign up</Button>
                  </Link>
                </div>
              </>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[300px] overflow-y-auto p-0">
                {/* Radix requires a title for the dialog to be announced;
                    the logo below is the visible equivalent. */}
                <SheetTitle className="sr-only">Site menu</SheetTitle>

                {/* pr-12 clears the sheet's own close button, which would
                    otherwise sit on top of the logo's "SRMAP" suffix. */}
                <div className="flex h-16 items-center border-b pl-5 pr-12">
                  <Logo />
                </div>

                <nav aria-label="Primary" className="p-3">
                  <ul className="space-y-1">
                    {visibleNav.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.url);
                      const highlighted = navHighlights[item.url];
                      const itemAccent = ROUTE_ACCENT[item.url] ?? ROUTE_ACCENT["/"];

                      return (
                        <li key={item.url}>
                          <Link
                            to={item.url}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                              active
                                ? `${itemAccent.pill} ${itemAccent.text}`
                                : "text-foreground/80 hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            {item.name}
                            {highlighted && (
                              <span className={cn("ml-auto h-2 w-2 shrink-0 rounded-full", itemAccent.dot)} aria-hidden />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <Separator className="my-3" />

                  <ul className="space-y-1">
                    {SECONDARY_NAV.map((item) => {
                      const highlighted = navHighlights[item.url];

                      return (
                        <li key={item.url}>
                          <Link
                            to={item.url}
                            aria-current={isActive(item.url) ? "page" : undefined}
                            className={cn(
                              "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive(item.url)
                                ? "text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {item.name}
                            {highlighted && (
                              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* The theme toggle's desktop home is the rail, which does not
                    exist at this width. Without this row there is no way to
                    change theme on a phone once signed in. */}
                <div className="flex items-center justify-between border-t px-5 py-3">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <DarkModeToggle />
                </div>

                <div className="border-t p-3">
                  {user ? (
                    <NavbarProfileMenu />
                  ) : (
                    <div className="space-y-2">
                      <Button asChild className="w-full">
                        <Link to="/signup">Sign up</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/signin" state={{ from: location }}>
                          Sign in
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

export default SiteHeader;
