/**
 * Visual metadata for each community kind.
 *
 * Centralised here rather than spread across CommunityCard, so the gradient
 * key, hover glow, and kind-pill colour always move together when a kind is
 * renamed or added.
 *
 * The gradient keys must exist in CardAccentBorder's GRADIENT_MAP.
 */

export type KindStyle = {
  /** Key passed to <CardAccentBorder gradient={…} /> */
  gradient: string;
  /** Tailwind classes for the hover glow overlay on the card */
  hoverGlow: string;
  /** Tailwind classes for the kind pill (background + text) */
  pill: string;
  /** Tailwind classes for the hover ring on the avatar */
  avatarRing: string;
  /** Tailwind classes for the "View group" secondary CTA text */
  cta: string;
};

const KIND_STYLES: Record<string, KindStyle> = {
  hackathon: {
    gradient:   "amber",
    hoverGlow:  "from-amber-500/5 to-transparent",
    pill:       "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    avatarRing: "group-hover:ring-amber-500/30",
    cta:        "text-amber-600 dark:text-amber-400",
  },
  project: {
    gradient:   "violet",
    hoverGlow:  "from-violet-500/5 to-transparent",
    pill:       "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400",
    avatarRing: "group-hover:ring-violet-500/30",
    cta:        "text-violet-600 dark:text-violet-400",
  },
  club: {
    gradient:   "rose",
    hoverGlow:  "from-rose-500/5 to-transparent",
    pill:       "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
    avatarRing: "group-hover:ring-rose-500/30",
    cta:        "text-rose-600 dark:text-rose-400",
  },
  study: {
    gradient:   "sky",
    hoverGlow:  "from-sky-500/5 to-transparent",
    pill:       "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
    avatarRing: "group-hover:ring-sky-500/30",
    cta:        "text-sky-600 dark:text-sky-400",
  },
  research: {
    gradient:   "emerald",
    hoverGlow:  "from-emerald-500/5 to-transparent",
    pill:       "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    avatarRing: "group-hover:ring-emerald-500/30",
    cta:        "text-emerald-600 dark:text-emerald-400",
  },
  general: {
    gradient:   "muted",
    hoverGlow:  "from-primary/5 to-transparent",
    pill:       "bg-muted border-border text-muted-foreground",
    avatarRing: "group-hover:ring-primary/20",
    cta:        "text-primary",
  },
};

/** Fallback: same as `general` so unknown kinds are never unstyled. */
const FALLBACK: KindStyle = KIND_STYLES.general;

export function getKindStyle(kind: string): KindStyle {
  return KIND_STYLES[kind] ?? FALLBACK;
}
