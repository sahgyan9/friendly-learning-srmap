import type { ComponentType, SVGProps } from "react";
import {
  BookOpen,
  Calendar,
  HelpCircle,
  Home,
  Info,
  Mail,
  MessageSquare,
  Users,
  UsersRound,
} from "lucide-react";

import { EventsIcon } from "@/components/icons/EventsIcon";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
export interface NavItem {
  name: string;
  url: string;
  /**
   * Deliberately wider than `typeof Home`. Lucide icons are
   * `ForwardRefExoticComponent`s, and typing the field as one of them rejects
   * any hand-written SVG component — which is what Faculty now uses. Every
   * render site passes `className` and `aria-hidden` and nothing else, so a
   * plain component type is all this needs to promise.
   */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Hidden from signed-out visitors, who can only be bounced to sign-in. */
  requiresAuth?: boolean;
}

/**
 * One list, rendered by every navigation surface: the desktop left rail, the
 * header's link row, and the mobile sheet.
 *
 * There were previously three navigations with three different link sets: a
 * floating pill, a hamburger menu, and the header. Faculty — the newest
 * feature — appeared in none of the mobile ones, and /community-posts was
 * labelled "Board" in one and "Community" in another. Keeping one array is what
 * stops that drift coming back, and it is why the rail added later renders this
 * array rather than declaring its own.
 *
 * Six entries, ordered by what someone signed in actually opens: the group
 * they're in, the board, what's on, their messages, faculty ratings. Mentors
 * stays in the secondary list below — a destination you go to once, when you
 * are looking for a particular person, and search reaches it both by name as
 * well as through a dozen aliases ("senior", "professor", "doubt").
 */
export const PRIMARY_NAV: NavItem[] = [
  { name: "Home", url: "/", icon: Home },
  { name: "Groups", url: "/workspace-groups", icon: GroupsIcon },
  { name: "Posts", url: "/posts", icon: PostIcon },
  { name: "Events", url: "/events", icon: EventsIcon },
  { name: "Messages", url: "/messages", icon: Mail, requiresAuth: true },
  { name: "Faculty", url: "/faculty", icon: FacultyIcon },
  { name: "Mentors", url: "/mentors", icon: MentorIcon },
];

/** Rendered under a rule in the rail and the sheet. Reachable from search anywhere. */
export const SECONDARY_NAV: NavItem[] = [
  { name: "How it works", url: "/how-it-works", icon: HelpCircle },
  { name: "Blog", url: "/blog", icon: BookOpen },
  { name: "About", url: "/about", icon: Info },
  { name: "Contact", url: "/contact", icon: Mail },
];

/**
 * Per-route accent palette — mirrors FeaturesShowcase card colours.
 * Each entry has Tailwind classes for: pill bg, text, dot, and border.
 */
export const ROUTE_ACCENT: Record<string, {
  pill: string;      // active pill bg
  text: string;      // active link text
  dot: string;       // "new" dot colour
  border: string;    // bottom accent border
}> = {
  // Explicit blue rather than `primary`. In dark mode `--primary` resolves to
  // `210 40% 98%` — very nearly white — so `text-primary` gave the active Home
  // entry a white glyph on a white-tinted pill, which reads as "disabled", not
  // "you are here". Every other entry below already names its colour outright;
  // these two were the odd ones out and the only two that broke in the dark.
  "/": {
    pill: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-500/40",
  },
  "/workspace-groups": {
    pill: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-500/40",
  },
  "/posts": {
    pill: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-500/40",
  },
  "/events": {
    pill: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
    border: "border-violet-500/40",
  },
  "/messages": {
    pill: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    border: "border-sky-500/40",
  },
  "/faculty": {
    pill: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    border: "border-rose-500/40",
  },
  "/mentors": {
    pill: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    border: "border-blue-500/40",
  },
};

/** Matches the most specific accent prefix for a path, falling back to the primary. */
export function accentFor(pathname: string) {
  const key = Object.keys(ROUTE_ACCENT)
    .filter((prefix) => (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)))
    .sort((a, b) => b.length - a.length)[0];
  return ROUTE_ACCENT[key] ?? ROUTE_ACCENT["/"];
}

/** True when `url` is the section the visitor is currently in. */
export function isActivePath(pathname: string, url: string) {
  return url === "/" ? pathname === "/" : pathname.startsWith(url);
}

/**
 * Routes that do *not* get the persistent left rail.
 *
 * The rail is the default everywhere else, including the homepage — this is a
 * denylist rather than an allowlist on purpose. One shell on every page is the
 * whole point of the pattern; a rail that comes and going as you move around
 * reads as a bug, and the two places it genuinely cannot go are both places
 * that already have a sidebar of their own:
 *
 * - `/messages` and `/admin` render their own full-height sidebars (the
 *   conversation list, the admin nav). A rail beside those is two sidebars in
 *   a row.
 * - The auth pages are a single centred form with nothing to navigate between.
 *   They also render their own theme toggle, which the rail would duplicate.
 */
const RAIL_EXCLUDED_PREFIXES = [
  "/messages",
  "/admin",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export function pathShowsRail(pathname: string) {
  return !RAIL_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
