import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import NavbarProfileMenu from "@/components/NavbarProfileMenu";
import MessagesIcon from "@/components/navbar/MessagesIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import SiteSearch from "@/components/search/SiteSearch";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { useCollapseOnScroll } from "@/hooks/useCollapseOnScroll";
import { useOAuthReturnPulse } from "@/hooks/useOAuthReturnPulse";
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
 * Primary navigation on mobile is handled by the thumb-accessible MobileNavDock
 * floating dock.
 */
export function SiteHeader() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const accent = accentFor(location.pathname);
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const { hasSeen: hasVisitedGroups } = useHasVisitedGroupsNav();
  const { hasSeen: hasVisitedEvents } = useHasVisitedEventsNav();
  const { hasSeen: hasVisitedMentors } = useHasVisitedMentorsNav();
  const returnPulse = useOAuthReturnPulse();
  const reducedMotion = useReducedMotion();

  // Reclaims the 64px bar for reading room on the search results feed. Scoped
  // to /search rather than site-wide because everywhere else this is the only
  // way back to the rest of the app — hiding it there would strand people.
  // (96, 64): same threshold as the mobile dock, collapsibleHeight matched to
  // this header's actual height so the hook's short-page guard is accurate.
  const isSearchPage = location.pathname === "/search";
  const scrolledPastThreshold = useCollapseOnScroll(96, 64);
  const headerCollapsed = isSearchPage && scrolledPastThreshold;

  // Points at where a feature lives in the nav until someone's found it.
  const tourCompleted = profile?.has_seen_welcome_tour === true;
  const navHighlights: Record<string, boolean> = {
    "/workspace-groups": tourCompleted && !hasVisitedGroups,
    "/events": tourCompleted && !hasVisitedEvents,
    "/mentors": tourCompleted && !hasVisitedMentors,
    "/faculty": !hasSeenFaculty,
  };

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
          "sticky top-0 z-50 overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 transition-all duration-300 ease-in-out",
          headerCollapsed ? "max-h-0" : "max-h-16 border-b",
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

          {/* Right: account & actions. Matches the left block's flex-1 so the centre
              stays centred. */}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
            {user ? (
              <>
                <MessagesIcon />
                <NotificationBell />
                <NavbarProfileMenu />
              </>
            ) : (
              <>
                <DarkModeToggle />
                <div className="relative flex items-center gap-2">
                  {/* Shown after someone backs out of Google's sign-in screen
                      without finishing it — a page reload with no completed
                      session and no obvious next step. The ring draws the eye
                      back to the one control that gets them back into it. */}
                  <AnimatePresence>
                    {returnPulse && !reducedMotion && (
                      <motion.span
                        className="pointer-events-none absolute -inset-2 -z-10 rounded-lg bg-primary/25"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: [0, 0.6, 0], scale: [0.85, 1.15, 1] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, times: [0, 0.45, 1] }}
                        aria-hidden
                      />
                    )}
                  </AnimatePresence>

                  {/* `state.from` returns the visitor to the page they were
                      on rather than dropping them on the homepage. Sign up is
                      folded into this same page: Google auth handles new and
                      returning accounts alike, and the "create a new account"
                      link there covers email/password signup for anyone who
                      wants it — so a separate Sign up button was a second door
                      to the same room. */}
                  <Link to="/signin" state={{ from: location }}>
                    <Button size="sm">Sign in</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default SiteHeader;
