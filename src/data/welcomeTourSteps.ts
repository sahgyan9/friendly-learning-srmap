import {
  Calendar,
  GraduationCap,
  HelpCircle,
  Rocket,
  Sparkles,
  Star,
  UsersRound,
  Users,
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
    accent: "primary",
    title: "Welcome to Friendly Learning SRMAP",
    description:
      "New to university? You don't have to figure it out alone. Here's what you can do here.",
  },
  {
    icon: HelpCircle,
    accent: "primary",
    title: "Ask a mentor any doubt",
    description:
      "Stuck on a course, an assignment, or just how things work here? Message a peer mentor for one-on-one help.",
    cta: { label: "Find a mentor", url: "/mentors" },
  },
  {
    icon: Users,
    accent: "emerald",
    title: "Find study partners",
    description:
      "Never study alone. Match with classmates in your courses to prep for exams and assignments together.",
    cta: { label: "Find study partners", url: "/find-study-partners" },
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
    title: "Join or start a group",
    description:
      "Find your people — department groups, interest communities, or start your own.",
    cta: { label: "Browse groups", url: "/communities" },
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
    icon: GraduationCap,
    accent: "primary",
    title: "Become a mentor yourself",
    description:
      "Once you've settled in, become a mentor so other freshers can find and learn from you.",
    cta: { label: "Become a mentor", url: "/become-mentor" },
  },
];
