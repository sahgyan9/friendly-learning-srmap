import {
  Calendar,
  HelpCircle,
  Rocket,
  Sparkles,
  Star,
  UserCircle,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface WelcomeTourStep {
  icon: LucideIcon;
  title: string;
  description: string;
  /**
   * Tailwind color name (without shade) used for the step's accent.
   * Maps to bg-{color}/10, text-{color}-600, border-{color}/20, etc.
   */
  accent: string;
  /** Omitted on the welcome and closing slides, which have nothing to link to yet. */
  cta?: { label: string; url: string };
}

/**
 * The first customer segment is freshers — university is entirely new to them,
 * so the tour is built around the things the platform lets them do, not a
 * feature-by-feature UI walkthrough.
 *
 * Accent colors are intentionally matched to the per-page accent used across
 * the app (emerald → community posts, rose → faculty, amber → communities,
 * violet → marketplace). The welcome and closing slides use the brand primary.
 */
export const WELCOME_TOUR_STEPS: WelcomeTourStep[] = [
  {
    icon: Sparkles,
    accent: "indigo",
    title: "Welcome to Friendly Learning SRMAP",
    description:
      "New to university? You don't have to figure it out alone. Here's what you can do here.",
  },
  {
    icon: UserCircle,
    accent: "teal",
    title: "Set up your profile",
    description:
      "Add a photo, a short bio, and your skills so mentors and other students actually recognize you.",
    cta: { label: "Complete your profile", url: "/profile" },
  },
  {
    icon: Star,
    accent: "rose",
    title: "Rate your faculty",
    description:
      "Picking courses? See honest, anonymous ratings on teaching, grading, and helpfulness from students who've taken them.",
    cta: { label: "Rate faculty", url: "/faculty" },
  },
  {
    icon: Rocket,
    accent: "violet",
    title: "Build something together",
    description: "Find teammates for hackathons, projects, and competitions.",
    cta: { label: "Find hackathon partners", url: "/opportunities" },
  },
  {
    icon: UsersRound,
    accent: "amber",
    title: "Join or create a workspace",
    description:
      "Find your people — department groups, interest communities, or create or start a workspace.",
    cta: { label: "Browse workspaces", url: "/communities" },
  },
  {
    icon: Calendar,
    accent: "sky",
    title: "See what's happening",
    description:
      "Browse fests, workshops, and events happening across university so you never miss out.",
    cta: { label: "View events", url: "/marketplace" },
  },
  {
    icon: HelpCircle,
    accent: "blue",
    title: "Ask a mentor any doubt",
    description:
      "Stuck on a course, an assignment, or just how things work here? Message a peer mentor for one-on-one help.",
    cta: { label: "Find a mentor", url: "/mentors" },
  },
];
