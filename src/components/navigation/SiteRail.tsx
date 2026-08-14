import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toggleTheme } from "@/lib/theme";
import { useAuth } from "@/context/AuthContext";
import { useSiteSidebar } from "@/context/SidebarContext";
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
 */
export function MainWithRail({ children }: { children: ReactNode }) {
  const location = useLocation();
  const showRail = pathShowsRail(location.pathname);
  const { isCollapsed } = useSiteSidebar();

  return (
    <>
      {showRail && <SiteRail />}
      {showRail && <MobileNavDock />}
      <main
        id="main-content"
        data-rail={showRail ? (isCollapsed ? "collapsed" : "expanded") : undefined}
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
 * Supports an expanded (w-56) and collapsed icon-rail (w-16) state with
 * accessible tooltips, keyboard shortcut (Ctrl+B), and persistent preference.
 */
export function SiteRail() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { isCollapsed, toggleSidebar } = useSiteSidebar();
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const { hasSeen: hasVisitedGroups } = useHasVisitedGroupsNav();
  const { hasSeen: hasVisitedEvents } = useHasVisitedEventsNav();
  const { hasSeen: hasVisitedMentors } = useHasVisitedMentorsNav();

  // Highlight rules for new/unseen features
  const tourCompleted = profile?.has_seen_welcome_tour === true;
  const navHighlights: Record<string, boolean> = {
    "/workspace-groups": tourCompleted && !hasVisitedGroups,
    "/events": tourCompleted && !hasVisitedEvents,
    "/mentors": tourCompleted && !hasVisitedMentors,
    "/faculty": !hasSeenFaculty,
  };

  const visibleNav = PRIMARY_NAV.filter((item) => !item.requiresAuth || user);

  return (
    <aside
      aria-label="Sections"
      className={cn(
        "fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] overflow-y-auto py-3 transition-[width,padding] duration-300 ease-in-out xl:block",
        isCollapsed ? "w-16 px-2 [scrollbar-width:none]" : "w-56 px-3 [scrollbar-width:thin]",
      )}
    >
      {/* Sidebar Collapse / Expand Toggle Button */}
      <div className={cn("mb-2 flex", isCollapsed ? "justify-center" : "justify-end px-1")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav>
        {/* Primary Navigation Links */}
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location.pathname, item.url);
            const highlighted = navHighlights[item.url];
            const accent = ROUTE_ACCENT[item.url] ?? ROUTE_ACCENT["/"];

            if (isCollapsed) {
              return (
                <li key={item.url} className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.url}
                        aria-label={item.name}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? `${accent.pill} ${accent.text}`
                            : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                        {highlighted && (
                          <span
                            className={cn(
                              "absolute right-1.5 top-1.5 h-2 w-2 shrink-0 rounded-full",
                              accent.dot,
                            )}
                            aria-hidden
                          />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

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
                  <span className="truncate">{item.name}</span>
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

        <Separator className={cn("my-3", isCollapsed ? "w-8 mx-auto" : "")} />

        {/* Secondary Navigation Links */}
        <ul className="space-y-1">
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location.pathname, item.url);
            const highlighted = navHighlights[item.url];

            if (isCollapsed) {
              return (
                <li key={item.url} className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.url}
                        aria-label={item.name}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {highlighted && (
                          <span
                            className="absolute right-1 top-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return (
              <li key={item.url}>
                <Link
                  to={item.url}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.name}</span>
                  {highlighted && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator className={cn("my-3", isCollapsed ? "w-8 mx-auto" : "")} />

      {/* Theme Toggle */}
      {isCollapsed ? (
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => toggleTheme()}
                aria-label="Toggle dark mode"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                  <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 text-yellow-300 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Toggle theme</TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => toggleTheme()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
            <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 text-yellow-300 transition-transform duration-300 dark:rotate-0 dark:scale-100" />
          </span>
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </button>
      )}
    </aside>
  );
}

export default SiteRail;
