import { Award, Star, type LucideIcon } from "lucide-react";

export interface MentorBenefit {
  icon: LucideIcon;
  title: string;
  body: string;
  /**
   * Per-benefit accent, as Tailwind classes. Stored alongside the copy the same
   * way FeaturesShowcase stores its `accent`/`accentBg` — a wall of identically
   * grey cards reads as a form to fill in, not a reason to bother.
   */
  accent: {
    /** Gradient tint + border for the card itself. */
    card: string;
    /** Icon chip. */
    chip: string;
    /** Heading. */
    title: string;
  };
  /**
   * The benefit that leads. The certificate is what people actually stay for,
   * so it gets the larger treatment and the sample artwork beneath it.
   */
  featured?: boolean;
}

/**
 * Why anyone would want to be a mentor here.
 *
 * Lives outside the /become-mentor page because the homepage now makes the same
 * case — the "See mentor benefits" toggle in MentorsSection expands these. One
 * copy, so a benefit that stops being true can never go stale in one place
 * while staying live in the other.
 *
 * Deliberately only two. This list previously carried five (the directory
 * listing, the take-a-break pause, and the privacy note as well), and five
 * hedged claims read as a feature dump rather than a reason. These two are the
 * ones that are *earned* rather than merely granted on signup, which is the
 * whole argument for mentoring here — so they are the only two that stay.
 */
export const MENTOR_BENEFITS: MentorBenefit[] = [
  {
    icon: Award,
    title: "A certificate you actually earned",
    body: "Not a participation badge — it records how many students you genuinely helped, and carries a public link anyone can check. Put it on a CV, a LinkedIn profile, an internship application.",
    featured: true,
    accent: {
      card: "from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30",
      chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      title: "text-amber-700 dark:text-amber-300",
    },
  },
  {
    icon: Star,
    title: "Badges from real reviews",
    body: "Students you help can rate you. Those ratings turn into badges on your profile and count towards your certificate.",
    accent: {
      card: "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30",
      chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      title: "text-emerald-700 dark:text-emerald-300",
    },
  },
];
