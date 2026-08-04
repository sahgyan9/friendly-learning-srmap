import {
  GraduationCap,
  HelpCircle,
  Rocket,
  Sparkles,
  UsersRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface WelcomeTourStep {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Omitted on the welcome and closing slides, which have nothing to link to yet. */
  cta?: { label: string; url: string };
}

/**
 * The first customer segment is freshers — university is entirely new to them,
 * so the tour is built around the five things the platform lets them do, not a
 * feature-by-feature UI walkthrough.
 */
export const WELCOME_TOUR_STEPS: WelcomeTourStep[] = [
  {
    icon: Sparkles,
    title: "Welcome to Friendly Learning SRMAP",
    description:
      "New to university? You don't have to figure it out alone. Here's what you can do here.",
  },
  {
    icon: HelpCircle,
    title: "Ask a mentor any doubt",
    description:
      "Stuck on a course, an assignment, or just how things work here? Message a peer mentor for one-on-one help.",
    cta: { label: "Find a mentor", url: "/mentors" },
  },
  {
    icon: Users,
    title: "Find study partners",
    description:
      "Never study alone. Match with classmates in your courses to prep for exams and assignments together.",
    cta: { label: "Find study partners", url: "/find-study-partners" },
  },
  {
    icon: Rocket,
    title: "Build something together",
    description: "Find teammates for hackathons, projects, and competitions.",
    cta: { label: "Find hackathon partners", url: "/hackathon-partners" },
  },
  {
    icon: UsersRound,
    title: "Join or start a group",
    description:
      "Find your people — department groups, interest communities, or start your own.",
    cta: { label: "Browse groups", url: "/communities" },
  },
  {
    icon: GraduationCap,
    title: "Become a mentor yourself",
    description:
      "Once you've settled in, become a mentor so other freshers can find and learn from you.",
    cta: { label: "Become a mentor", url: "/become-mentor" },
  },
];
