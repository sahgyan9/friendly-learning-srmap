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
 * One list, used by both the desktop row and the mobile sheet.
 *
 * There were previously three navigations with three different link sets: a
 * floating pill, a hamburger menu, and this. Faculty — the newest feature —
 * appeared in none of the mobile ones, and /community-posts was labelled
 * "Board" in one and "Community" in another.
 */
const PRIMARY_NAV: NavItem[] = [
  { name: "Home", url: "/", icon: Home },
  { name: "Mentors", url: "/mentors", icon: Users },
  { name: "Faculty", url: "/faculty", icon: GraduationCap },
  { name: "Posts", url: "/community-posts", icon: MessageSquare },
  { name: "Groups", url: "/communities", icon: UsersRound },
  { name: "Events", url: "/marketplace", icon: Calendar },
  { name: "Messages", url: "/messages", icon: Mail, requiresAuth: true },
];

const SECONDARY_NAV = [
  { name: "How it works", url: "/how-it-works" },
  { name: "Blog", url: "/blog" },
  { name: "About", url: "/about" },
  { name: "Contact", url: "/contact" },
];

/**
 * The site's only navigation.
 *
 * It replaced a `fixed`, centre-positioned pill that shared the header band
 * with a separate sticky bar. Between roughly 768px and 1150px the pill sat on
 * top of the logo and the Sign In button, clipping both. Everything is in
 * normal flex flow now, so the elements cannot overlap at any width.
 */
export function SiteHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Route changes must close the sheet, or tapping a link leaves the overlay
  // covering the page you just navigated to.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  const visibleNav = PRIMARY_NAV.filter((item) => !item.requiresAuth || user);

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

            {/* Inline links appear only once there is genuinely room for them. */}
            <nav aria-label="Primary" className="hidden flex-1 items-center justify-center lg:flex">
              <ul className="flex items-center gap-1">
                {visibleNav.map((item) => {
                  const active = isActive(item.url);
                  const showDot = item.url === "/faculty" && !hasSeenFaculty;

                  return (
                    <li key={item.url}>
                      <Link
                        to={item.url}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative block rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {item.name}

                        {showDot && (
                          <span
                            aria-hidden
                            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        )}
                        {showDot && <span className="sr-only">(new)</span>}

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

            <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
              {/* Ahead of the icon cluster so it reads as part of the page
                  rather than as one more button. The six links above cannot
                  cover twenty destinations; this is how the rest are found. */}
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
                        const showDot = item.url === "/faculty" && !hasSeenFaculty;

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
                              {showDot && (
                                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                  New
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>

                    <Separator className="my-3" />

                    <ul className="space-y-1">
                      {SECONDARY_NAV.map((item) => (
                        <li key={item.url}>
                          <Link
                            to={item.url}
                            aria-current={isActive(item.url) ? "page" : undefined}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive(item.url)
                                ? "text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {item.name}
                          </Link>
                        </li>
                      ))}
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
      </header>
    </>
  );
}

export default SiteHeader;
