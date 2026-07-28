import { Calendar, GraduationCap, Home, Mail, MessageSquare, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

import DarkModeToggle from "@/components/DarkModeToggle";
import { cn } from "@/lib/utils";
import { useHasSeenFacultyRatings } from "@/hooks/useFeatureAnnouncement";

const NAV_ITEMS = [
  { name: "Home", url: "/", icon: Home },
  { name: "Mentors", url: "/mentors", icon: Users },
  { name: "Faculty", url: "/faculty", icon: GraduationCap },
  { name: "Board", url: "/community-posts", icon: MessageSquare },
  { name: "Events", url: "/marketplace", icon: Calendar },
  { name: "Messages", url: "/messages", icon: Mail },
];

/**
 * Primary navigation: a bottom bar on mobile, a floating pill on desktop.
 *
 * The active item is derived from the current route. The previous version
 * tracked it in local state that was only updated on click, so landing on
 * /mentors directly — or navigating from any other link — left "Home"
 * highlighted.
 */
export function MainNav() {
  const location = useLocation();
  const { hasSeen: hasSeenFaculty } = useHasSeenFacultyRatings();

  const isActive = (url: string) =>
    url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed bottom-0 left-1/2 z-50 -translate-x-1/2 sm:bottom-auto sm:top-0",
        "mb-4 w-max max-w-[calc(100vw-1rem)] sm:mb-0 sm:pt-6",
      )}
    >
      <div className="flex items-center gap-1 rounded-full border border-border bg-background/80 p-1 shadow-lg backdrop-blur-lg sm:gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.url);
          const showDot = item.url === "/faculty" && !hasSeenFaculty;

          return (
            <Link
              key={item.name}
              to={item.url}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative cursor-pointer rounded-full px-3 py-2 text-sm font-semibold transition-colors md:px-5",
                "text-foreground/70 hover:text-primary",
                active && "text-primary",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
                <span className="sr-only">{item.name}</span>
              </span>

              {/* Unseen-feature dot: the only affordance a first-time visitor
                  gets that something new is here. Cleared on first visit. */}
              {showDot && (
                <span
                  aria-label="New"
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background md:right-2"
                />
              )}

              {active && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-primary/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary">
                    <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-primary/20 blur-md" />
                  </div>
                </motion.div>
              )}
            </Link>
          );
        })}

        <div className="hidden items-center pl-1 pr-1 md:flex">
          <DarkModeToggle />
        </div>
      </div>
    </nav>
  );
}

export default MainNav;
