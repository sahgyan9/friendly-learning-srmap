import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { toggleTheme } from "@/lib/theme";
import { useAuth } from "@/context/AuthContext";
import {
  useHasSeenFacultyRatings,
  useHasVisitedEventsNav,
  useHasVisitedGroupsNav,
  useHasVisitedMentorsNav,
} from "@/hooks/useFeatureAnnouncement";
import { cn } from "@/lib/utils";
import { MobileNavDock } from "./MobileNavDock";
import {
  PRIMARY_NAV,
  ROUTE_ACCENT,
  SECONDARY_NAV,
  isActivePath,
  pathShowsRail,
} from "./nav-config";

/**
 * <main> plus the rail beside it, on the routes that get one.
 *
 * This owns both halves on purpose: the rail is fixed-position, so the only
 * thing keeping page content out from under it is the matching padding here.
 * Splitting the two across App.tsx is how they would drift apart.
 *
 * `data-rail` is the hook the inset hangs off; the rule itself lives in
 * index.css, next to a note on why it insets the containers rather than
 * <main>. The short version: padding <main> also insets its children's
 * backgrounds, and the homepage's full-bleed colour bands then stop short of
 * both edges with a visible seam.
 *
 * This is a component rather than a `useLocation()` call in App because App
 * renders every provider in the tree, and re-running it on each navigation
 * just to decide one attribute is a lot of tree for one boolean.
 */
export function MainWithRail({ children }: { children: ReactNode }) {
  const location = useLocation();
  const showRail = pathShowsRail(location.pathname);

  return (
    <>
      {showRail && <SiteRail />}
      {showRail && <MobileNavDock />}
      <main
        id="main-content"
        data-rail={showRail ? "" : undefined}
        className={showRail ? "pb-20 lg:pb-0" : undefined}
      >
        {children}
      </main>
    </>
  );
}

/**
 * The persistent left navigation, on desktop, on feed-shaped pages.
 *
 * It exists because the header's link row collapses on scroll: on a page you
 * arrive at to browse, the navigation vanished as soon as you started reading,
 * and switching sections meant scrolling all the way back to the top. The rail
 * is always there. Reclaimed vertical space is a side effect, not the point —
 * the collapsing row was already costing zero pixels once you were scrolled in.
 *
 * `lg` and up only. Below that there is no width for a rail and the header's
 * sheet stays the mobile navigation. Which routes get it is decided by
 * `pathShowsRail` in nav-config, not here, because <main>'s left padding in
 * App.tsx has to agree with it.
 */
export function SiteRail() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const { hasSeen: hasVisitedGroups } = useHasVisitedGroupsNav();
  const { hasSeen: hasVisitedEvents } = useHasVisitedEventsNav();
  const { hasSeen: hasVisitedMentors } = useHasVisitedMentorsNav();

  // Same rules as the header: points at where a feature lives until someone's
  // found it. Groups/Events/Mentors only light up once the welcome tour has
  // shown them the feature; Faculty ratings is its own standalone announcement.
  const tourCompleted = profile?.has_seen_welcome_tour === true;
  const navHighlights: Record<string, boolean> = {
    "/communities": tourCompleted && !hasVisitedGroups,
    "/marketplace": tourCompleted && !hasVisitedEvents,
    "/mentors": tourCompleted && !hasVisitedMentors,
    "/faculty": !hasSeenFaculty,
  };

  const visibleNav = PRIMARY_NAV.filter((item) => !item.requiresAuth || user);

  return (
    // No border and no background of its own. A rule down the right edge drew
    // a box around the navigation and made it compete with the feed for
    // attention; without it the links read as sitting on the page, which is
    // the whole point of putting them out here. It also means the rail never
    // needs to track the background of whichever section is scrolling past
    // behind it.
    //
    // top-16 clears the header, which is exactly one 64px row. Its own scroll,
    // so a long secondary list can never push the page height around.
    //
    // `xl`, not `lg`: the content column is centred on the viewport, which
    // costs a rail's width on *both* sides. Below 1280px there is not enough
    // left over to be worth it, and the header's centre icons are the
    // navigation at those widths.
    <aside
      aria-label="Sections"
      className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-56 overflow-y-auto px-3 py-4 [scrollbar-width:thin] xl:block"
    >
      <nav>
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location.pathname, item.url);
            const highlighted = navHighlights[item.url];
            const accent = ROUTE_ACCENT[item.url] ?? ROUTE_ACCENT["/"];

            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? `${accent.pill} ${accent.text}`
                      : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.name}
                  {highlighted && (
                    <span
                      className={cn("ml-auto h-2 w-2 shrink-0 rounded-full", accent.dot)}
                      aria-hidden
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <Separator className="my-3" />

        <ul className="space-y-1">
          {SECONDARY_NAV.map((item) => {
            const active = isActivePath(location.pathname, item.url);
            const highlighted = navHighlights[item.url];

            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
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

      <Separator className="my-3" />

      {/* Holds no React state, for the same two reasons DarkModeToggle does
          not: public pages are prerendered, so markup driven by a runtime-only
          value would mismatch on hydration for anyone whose stored theme is
          not the default; and the auth pages render their own toggle, which a
          second copy of local state would immediately disagree with. The
          current theme lives in exactly one place — the `dark` class on
          <html> — and every icon and label below is switched by CSS from it. */}
      <button
        type="button"
        onClick={() => toggleTheme()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
          <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 text-yellow-300 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
        </span>
        {/* Exactly one of these is in the accessibility tree at a time, and
            each names the action rather than the current state. */}
        <span className="dark:hidden">Dark mode</span>
        <span className="hidden dark:inline">Light mode</span>
      </button>
    </aside>
  );
}

export default SiteRail;
