import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  GraduationCap,
  Home,
  Mail,
  Menu,
  MessageSquare,
  Users,
  UsersRound,
} from "lucide-react";

import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import NavbarProfileMenu from "@/components/NavbarProfileMenu";
import MessagesIcon from "@/components/navbar/MessagesIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import SiteSearch from "@/components/search/SiteSearch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useCollapseOnScroll } from "@/hooks/useCollapseOnScroll";
import { useHasSeenFacultyRatings } from "@/hooks/useFeatureAnnouncement";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: typeof Home;
  /** Hidden from signed-out visitors, who can only be bounced to sign-in. */
  requiresAuth?: boolean;
}

/**
 * One list, rendered identically by the desktop row and the mobile sheet.
 *
 * There were previously three navigations with three different link sets: a
 * floating pill, a hamburger menu, and this. Faculty — the newest feature —
 * appeared in none of the mobile ones, and /community-posts was labelled
 * "Board" in one and "Community" in another. Keeping one array is what stops
 * that drift coming back.
 *
 * Five entries, ordered by what someone signed in actually opens: the group
 * they're in, the board, what's on, their messages. Mentors and Faculty moved
 * to the secondary list below — they are destinations you go to once, when you
 * are looking for a particular person, and search reaches both by name as well
 * as through a dozen aliases ("senior", "professor", "doubt").
 */
const PRIMARY_NAV: NavItem[] = [
  { name: "Home", url: "/", icon: Home },
  { name: "Groups", url: "/communities", icon: UsersRound },
  { name: "Posts", url: "/community-posts", icon: MessageSquare },
  { name: "Events", url: "/marketplace", icon: Calendar },
  { name: "Messages", url: "/messages", icon: Mail, requiresAuth: true },
];

/** Rendered in the mobile sheet, under a rule. Reachable from search anywhere. */
const SECONDARY_NAV = [
  { name: "Mentors", url: "/mentors", icon: Users },
  { name: "Faculty", url: "/faculty", icon: GraduationCap },
  { name: "How it works", url: "/how-it-works" },
  { name: "Blog", url: "/blog" },
  { name: "About", url: "/about" },
  { name: "Contact", url: "/contact" },
];

/**
 * The site's only navigation.
 *
 * Desktop splits it across two rows — identity and search on top, links
 * underneath — because a single 64px band was holding a logo, seven links, a
 * search field and four icons: about 1080px of content in a 1280px container,
 * tight enough that the search field had to collapse to a bare icon between
 * 1024px and 1280px just to fit. The link row has since been cut to five, but
 * the split stays: it is what lets the search field be a real field rather than
 * an icon. The second row collapses on scroll (see
 * useCollapseOnScroll) so the taller header is only paid for at the top of a
 * page, not the whole way down a feed.
 *
 * Below `lg` there is still one row and a sheet, which was never the crowded
 * case.
 */
export function SiteHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navCollapsed = useCollapseOnScroll();

  // Route changes must close the sheet, or tapping a link leaves the overlay
  // covering the page you just navigated to.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const visibleNav = PRIMARY_NAV.filter((item) => !item.requiresAuth || user);

  // The collapsed row is clipped to zero height rather than unmounted, so that
  // it can animate. `inert` is what keeps a Tab press out of links nobody can
  // see; React 18 has no typing for it, hence the string spread.
  const inertWhenCollapsed = (navCollapsed ? { inert: "" } : {}) as Record<string, string>;

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

      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center gap-4">
            <Link to="/" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Logo />
            </Link>

            <div className="ml-auto flex shrink-0 items-center gap-1">
              {/* Ahead of the icon cluster so it reads as part of the page
                  rather than as one more button. Five links cannot cover twenty
                  destinations — Mentors and Faculty among them — and this is how
                  the rest are found. */}
              <div className="mr-1">
                <SiteSearch />
              </div>

              {user ? (
                <>
                  <MessagesIcon />
                  <NotificationBell />
                  <DarkModeToggle />
                  <div className="hidden lg:block">
                    <NavbarProfileMenu />
                  </div>
                </>
              ) : (
                <>
                  <DarkModeToggle />
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

                        return (
                          <li key={item.url}>
                            <Link
                              to={item.url}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground/80 hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" aria-hidden />
                              {item.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>

                    <Separator className="my-3" />

                    <ul className="space-y-1">
                      {SECONDARY_NAV.map((item) => {
                        // Faculty ratings are the newest thing here and no
                        // longer sit in the top row, so the announcement badge
                        // followed the link down rather than being dropped.
                        const showNew = item.url === "/faculty" && !hasSeenFaculty;

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
                              {showNew && (
                                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  New
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </nav>

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
        </div>

        {/* Row two: the links, on desktop only. Clipped to zero height on the
            way down the page and restored on the way back up. `h-12` is
            duplicated on the clip and on the nav so the collapse animates
            against a known height — `h-auto` would not transition. */}
        <div
          className={cn(
            "hidden overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none lg:block",
            navCollapsed ? "h-0" : "h-12",
          )}
        >
          <div className="container mx-auto px-4">
            {/* No rule between the rows: the two bands share a background and
                read as one header, and a divider only chopped it in half. */}
            <nav
              aria-label="Primary"
              className="flex h-12 items-center justify-center"
              {...inertWhenCollapsed}
            >
              {/* Roomy on purpose. Labels centred at the old gap-1 read as one
                  clump of text rather than as separate destinations; the space
                  is free here, since nothing else shares the row. */}
              <ul className="flex items-center gap-2 xl:gap-4">
                {visibleNav.map((item) => {
                  const active = isActive(item.url);

                  return (
                    <li key={item.url}>
                      <Link
                        to={item.url}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative block rounded-full px-4 py-2 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {item.name}

                        {active && (
                          <motion.span
                            layoutId="site-nav-active"
                            className="absolute inset-0 -z-10 rounded-full bg-primary/10"
                            initial={false}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export default SiteHeader;
