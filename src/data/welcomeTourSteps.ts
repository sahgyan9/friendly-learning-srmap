import type { ComponentType, SVGProps } from "react";
import { Compass, UserRound, UsersRound } from "lucide-react";

import { EventsIcon } from "@/components/icons/EventsIcon";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";

export interface WelcomeTourStep {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Two or three words; shown on the progress bar and as the step's label. */
  label: string;
  title: string;
  description: string;
  /** Omitted on the welcome slide, which has nothing to link to yet. */
  cta?: { label: string; url: string };
}

/**
 * The first customer segment is freshers — university is entirely new to them,
 * so the tour is built around the things the platform lets them do, not a
 * feature-by-feature UI walkthrough.
 *
 * Each step uses the same icon as that section's nav entry, so the tour
 * teaches the icons people will be looking for afterwards.
 */
export const WELCOME_TOUR_STEPS: WelcomeTourStep[] = [
  {
    icon: Compass,
    label: "Welcome",
    title: "Welcome to Friendly Learning SRMAP",
    description:
      "New to university? Here is where to find people who can help, and what is on around campus. Seven short steps.",
  },
  {
    icon: UserRound,
    label: "Profile",
    title: "Set up your profile",
    description:
      "Add a photo, a short bio and your skills, so mentors and other students know who they are talking to.",
    cta: { label: "Edit profile", url: "/profile" },
  },
  {
    icon: PostIcon,
    label: "Posts",
    title: "Post to the campus board",
    description:
      "Ask a question, share news or a result, and reply to what other students have posted.",
    cta: { label: "Open posts", url: "/posts" },
  },
  {
    icon: GroupsIcon,
    label: "Groups",
    title: "Work together in groups",
    description:
      "Create or join a group with its own channels for chat, files and project work. Groups can be public or private.",
    cta: { label: "Browse groups", url: "/workspace-groups" },
  },
  {
    icon: FacultyIcon,
    label: "Faculty",
    title: "Read and leave faculty ratings",
    description:
      "Choosing courses? See anonymous ratings on teaching, grading and helpfulness from students who took them.",
    cta: { label: "Browse faculty", url: "/faculty" },
  },
  {
    icon: UsersRound,
    label: "Teammates",
    title: "Find teammates",
    description: "Look for people to team up with for hackathons, projects and competitions.",
    cta: { label: "View opportunities", url: "/opportunities" },
  },
  {
    icon: EventsIcon,
    label: "Events",
    title: "See what is on",
    description: "Fests, workshops and talks across the university, with reminders before the ones you mark.",
    cta: { label: "View events", url: "/events" },
  },
  {
    icon: MentorIcon,
    label: "Mentors",
    title: "Message a mentor",
    description:
      "Stuck on a course, an assignment or how something works here? Senior students answer one-on-one.",
    cta: { label: "Find a mentor", url: "/mentors" },
  },
];
