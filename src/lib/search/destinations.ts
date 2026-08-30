import type { ComponentType, SVGProps } from "react";
import { EventsIcon } from "@/components/icons/EventsIcon";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  Flag,
  Handshake,
  Home,
  Info,
  LifeBuoy,
  LogIn,
  Mail,
  MessageSquare,
  Moon,
  Route,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
  Settings,
  Trophy,
  UsersRound,
  Bell,
  AlertTriangle,
} from "lucide-react";

/**
 * Everything the search bar can take you to that is not a database row.
 *
 * The point of the `keywords` list is that people search for what they want,
 * not for what we called it. A fresher looking for help types "senior", not
 * "mentor"; someone with a broken page types "bug", not "contact". Every one of
 * those has to land somewhere sensible or the search feels broken, and a
 * visitor who searches once and gets nothing does not search again.
 *
 * Keywords are matched as whole words and as prefixes, so there is no need to
 * list plurals of a word already here — "mentor" already answers "mentors".
 */

/** Non-navigation entries, run instead of followed. */
export type SearchActionId = "toggle-theme" | "open-notifications";

/**
 * Who an entry is for. An entry with no rule shows to everyone; an entry with
 * several shows if any of them holds.
 */
export type Audience = "signedIn" | "signedOut" | "mentor" | "notMentor" | "admin";

export interface SearchDestination {
  id: string;
  label: string;
  /** The second line. Says what the page is for, not what it is called. */
  hint: string;
  /**
   * Wider than lucide's own icon type on purpose: lucide icons are
   * `ForwardRefExoticComponent`s, and naming that type here rejects any
   * hand-written SVG component — which is what the Faculty entry uses.
   */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  group: string;
  keywords: string[];
  /** Where it goes. Exactly one of `to` or `action` is set. */
  to?: string;
  action?: SearchActionId;
  audience?: Audience[];
}

export const GROUP_ORDER = [
  "Best match",
  "Mentors",
  "Faculty",
  "Posts",
  "Reading",
  "Go to",
  "Your account",
  "Actions",
  "Admin",
] as const;

export const DESTINATIONS: SearchDestination[] = [
  // ---------------------------------------------------------------- Go to
  {
    id: "home",
    label: "Home",
    hint: "The front page",
    icon: Home,
    group: "Go to",
    keywords: ["home", "homepage", "front page", "start", "main", "landing", "index"],
    to: "/",
  },
  {
    id: "mentors",
    label: "Mentors",
    hint: "Browse students a year or two ahead who can help",
    icon: MentorIcon,
    group: "Go to",
    keywords: [
      "mentor", "mentors", "mentorship", "senior", "seniors", "senior student",
      "buddy", "guide", "tutor", "coach", "helper", "help me", "ask", "doubt",
      "doubts", "find a mentor", "talk to a senior", "juniors", "guidance",
    ],
    to: "/mentors",
  },
  {
    id: "faculty",
    label: "Faculty",
    hint: "Ratings and reviews for lecturers, by department",
    icon: FacultyIcon,
    group: "Go to",
    keywords: [
      "faculty", "professor", "prof", "teacher", "lecturer", "sir", "madam",
      "maam", "staff", "instructor", "rating", "ratings", "review", "reviews",
      "course", "subject", "class", "teaching", "grading", "who teaches",
    ],
    to: "/faculty",
  },
  {
    id: "posts",
    label: "Posts",
    hint: "The community board — ask for teammates, study help or advice",
    icon: PostIcon,
    group: "Go to",
    // "community" on its own belongs to Groups now — that is what the word
    // means once groups exist. The board keeps the phrase "community post".
    keywords: [
      "post", "posts", "community post", "board", "forum", "feed",
      "discussion", "notice board", "share", "announcement", "ask everyone",
    ],
    to: "/posts",
  },
  {
    id: "communities",
    label: "Workspace Groups",
    hint: "Hackathon teams, clubs and study circles you can join",
    icon: GroupsIcon,
    group: "Go to",
    keywords: [
      "workspace", "workspaces", "workspace groups", "group", "groups", "community", "communities", "team", "teams", "club",
      "clubs", "society", "societies", "circle", "join a group", "start a group",
      "create a group", "my groups", "chapter",
    ],
    to: "/workspace-groups",
  },
  {
    id: "events",
    label: "University Events",
    hint: "Workshops, fests, competitions and club activities",
    icon: EventsIcon,
    group: "Go to",
    keywords: [
      // "club" belongs to Groups — a club is a group you join, not a one-off
      // event. Leaving it on both made an exact-keyword tie that Events won on
      // nothing more meaningful than coming first alphabetically.
      "event", "events", "srmap events", "university events", "workshop", "fest", "seminar", "competition", "contest",
      "activity", "activities", "whats on", "marketplace", "calendar",
    ],
    to: "/events",
  },
  {
    id: "hackathon-partners",
    label: "Hackathon partners",
    hint: "Find teammates for a hackathon",
    icon: Trophy,
    group: "Go to",
    keywords: [
      "hackathon", "hack", "teammate", "team", "team member", "partner", "sih",
      "smart india hackathon", "coding competition", "build together",
    ],
    to: "/hackathon-partners",
  },
  {
    id: "study-partners",
    label: "Study partners",
    hint: "Find someone to prepare with",
    icon: BookOpen,
    group: "Go to",
    keywords: [
      "study", "study partner", "study buddy", "study group", "group study",
      "exam", "exams", "revision", "prepare", "prep", "practice together",
    ],
    to: "/find-study-partners",
  },

  // ------------------------------------------------------------- Reading
  {
    id: "blog",
    label: "Blog",
    hint: "Guides on electives, exams and campus life",
    icon: FileText,
    group: "Go to",
    keywords: ["blog", "article", "articles", "guide", "guides", "read", "reading", "tips", "advice", "how to"],
    to: "/blog",
  },
  {
    id: "how-it-works",
    label: "How it works",
    hint: "What to do first, and what happens after",
    icon: Route,
    group: "Go to",
    keywords: [
      "how it works", "how to use", "how does this work", "getting started",
      "get started", "tutorial", "walkthrough", "steps", "explain", "new here",
    ],
    to: "/how-it-works",
  },
  {
    id: "about",
    label: "About Friendly Learning",
    hint: "What this is for, who runs it and why it exists",
    icon: Info,
    group: "Go to",
    keywords: [
      // Not "team": somebody typing that wants a hackathon team or a group,
      // not the page about who built the site. "the team" still gets here.
      "about", "about us", "aim", "aims", "goal", "mission", "purpose", "vision",
      "why", "why friendly learning", "what is friendly learning", "story",
      "who we are", "the team", "founders", "idea behind",
    ],
    to: "/about",
  },
  {
    id: "contact",
    label: "Contact & report a problem",
    hint: "Report a bug, send feedback or ask for help",
    icon: LifeBuoy,
    group: "Go to",
    keywords: [
      "contact", "contact us", "bug", "bugs", "issue", "issues", "problem",
      "broken", "not working", "error", "report", "report a bug", "feedback",
      "complaint", "complain", "suggestion", "suggest", "support", "help desk",
      "email us", "reach out", "get in touch",
    ],
    to: "/contact",
  },

  // ------------------------------------------------------- Your account
  {
    id: "profile",
    label: "My profile",
    hint: "Your details, badges and public profile",
    icon: User,
    group: "Your account",
    keywords: [
      "profile", "my profile", "account", "my account", "settings", "my settings",
      "edit profile", "my details", "me", "my page", "photo", "avatar",
    ],
    to: "/profile",
    audience: ["signedIn"],
  },
  {
    id: "messages",
    label: "Messages",
    hint: "Your conversations with mentors and students",
    icon: Mail,
    group: "Your account",
    keywords: [
      "message", "messages", "chat", "chats", "dm", "dms", "inbox",
      "conversation", "conversations", "talk", "reply", "unread messages",
    ],
    to: "/messages",
    audience: ["signedIn"],
  },
  {
    id: "notifications",
    label: "Notifications",
    hint: "Open the notification bell",
    icon: Bell,
    group: "Your account",
    keywords: [
      "notification", "notifications", "bell", "alert", "alerts", "updates",
      "unread", "whats new", "activity",
    ],
    action: "open-notifications",
    audience: ["signedIn"],
  },
  {
    id: "certificate",
    label: "My certificate",
    hint: "Your mentoring certificate, and how far off it is",
    icon: Award,
    group: "Your account",
    keywords: [
      "certificate", "my certificate", "award", "proof", "linkedin", "download",
      "verify", "credential", "recognition",
    ],
    to: "/certificate",
    audience: ["mentor"],
  },
  {
    id: "become-mentor",
    label: "Become a mentor",
    hint: "What you get for helping, and how to get listed",
    icon: Handshake,
    group: "Go to",
    keywords: [
      "become a mentor", "be a mentor", "join as mentor", "sign up as mentor",
      "volunteer", "help others", "help juniors", "willing to help", "give back",
      "mentor benefits", "benefits", "why become a mentor", "whats in it for me",
      "perks", "reward", "rewards", "certificate",
    ],
    to: "/become-mentor",
    audience: ["notMentor"],
  },
  {
    id: "signin",
    label: "Sign in",
    hint: "Already have an account",
    icon: LogIn,
    group: "Your account",
    keywords: ["sign in", "signin", "log in", "login", "logon", "enter"],
    to: "/signin",
    audience: ["signedOut"],
  },
  {
    id: "signup",
    label: "Sign up",
    hint: "Create an account with your SRM AP email",
    icon: UserPlus,
    group: "Your account",
    keywords: ["sign up", "signup", "register", "registration", "create account", "join", "new account"],
    to: "/signup",
    audience: ["signedOut"],
  },

  // ------------------------------------------------------------- Actions
  {
    id: "toggle-theme",
    label: "Switch theme",
    hint: "Between dark and light",
    icon: Moon,
    group: "Actions",
    keywords: [
      "theme", "dark", "light", "dark mode", "light mode", "night", "night mode",
      "day mode", "appearance", "brightness", "colour", "color", "switch theme",
    ],
    action: "toggle-theme",
  },

  // --------------------------------------------------------------- Admin
  {
    id: "admin",
    label: "Admin dashboard",
    hint: "Overview of the whole platform",
    icon: Shield,
    group: "Admin",
    keywords: ["admin", "dashboard", "control panel", "manage", "backend"],
    to: "/admin",
    audience: ["admin"],
  },
  {
    id: "admin-mentor-verification",
    label: "Mentor verification",
    hint: "Applications and flagged profiles",
    icon: ShieldCheck,
    group: "Admin",
    keywords: ["verification", "verify", "applications", "applicants", "flag", "flags", "flagged", "approve", "reject", "review mentors"],
    to: "/admin/mentor-verification",
    audience: ["admin"],
  },
  {
    id: "admin-contact-messages",
    label: "Contact messages",
    hint: "What people have sent through the contact form",
    icon: Mail,
    group: "Admin",
    keywords: ["contact messages", "enquiries", "enquiry", "inbox", "support inbox", "reports"],
    to: "/admin/contact-messages",
    audience: ["admin"],
  },
  {
    id: "admin-error-reports",
    label: "Error reports",
    hint: "Errors students flagged with the 'Report' button on a toast",
    icon: AlertTriangle,
    group: "Admin",
    keywords: ["error reports", "errors", "bugs", "report error", "flagged errors", "toast report"],
    to: "/admin/error-reports",
    audience: ["admin"],
  },
  {
    id: "admin-badges",
    label: "Badges",
    hint: "Award and manage mentor badges",
    icon: Sparkles,
    group: "Admin",
    keywords: ["badge", "badges", "award badge", "achievements"],
    to: "/admin/badges",
    audience: ["admin"],
  },
  {
    id: "admin-events",
    label: "Manage events",
    hint: "Add and edit what shows on the events page",
    icon: Calendar,
    group: "Admin",
    keywords: ["manage events", "edit events", "add event", "marketplace admin"],
    to: "/admin/events",
    audience: ["admin"],
  },
  {
    id: "admin-team",
    label: "Team members",
    hint: "Who appears on the About page",
    icon: Building2,
    group: "Admin",
    keywords: ["team members", "team", "about page team", "contributors"],
    to: "/admin/team-members",
    audience: ["admin"],
  },
  {
    id: "admin-settings",
    label: "Platform settings",
    hint: "Site-wide configuration",
    icon: Settings,
    group: "Admin",
    keywords: ["platform settings", "site settings", "configuration", "config"],
    to: "/admin/settings",
    audience: ["admin"],
  },
  {
    id: "admin-security",
    label: "Security",
    hint: "Audit log and access controls",
    icon: Flag,
    group: "Admin",
    keywords: ["security", "audit", "audit log", "access", "permissions", "roles"],
    to: "/admin/security",
    audience: ["admin"],
  },
];

export interface Viewer {
  signedIn: boolean;
  isMentor: boolean;
  isAdmin: boolean;
}

/** Whether this viewer should be offered this destination at all. */
export function isVisibleTo(destination: SearchDestination, viewer: Viewer): boolean {
  if (!destination.audience || destination.audience.length === 0) return true;

  return destination.audience.some((rule) => {
    switch (rule) {
      case "signedIn":
        return viewer.signedIn;
      case "signedOut":
        return !viewer.signedIn;
      case "mentor":
        return viewer.isMentor;
      case "notMentor":
        return !viewer.isMentor;
      case "admin":
        return viewer.isAdmin;
      default:
        return false;
    }
  });
}

/**
 * What to show before anything has been typed. Deliberately short — a wall of
 * options on open is as unhelpful as none.
 *
 * Mentors and Faculty lead on purpose, and the order matters more than it used
 * to: neither one is in the navbar any more, so for a signed-in student this
 * list is the shortest route to both. Do not demote them without giving them a
 * home somewhere else first.
 */
export const DEFAULT_SUGGESTION_IDS = [
  "mentors",
  "faculty",
  "posts",
  "communities",
  "events",
  "become-mentor",
  "messages",
  "profile",
  "how-it-works",
  "contact",
  "toggle-theme",
];
