import { Award, HandHelping, Medal, Trophy, type LucideIcon } from "lucide-react";

/**
 * badge_types.icon holds an emoji from the original seed data. The UI draws a
 * stroke icon per category instead, so badges sit with the rest of the icon set
 * and render the same on every platform.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  performance: Trophy,
  expertise: Award,
  contribution: HandHelping,
  special: Medal,
};

export const badgeIconFor = (category?: string | null): LucideIcon =>
  (category && CATEGORY_ICONS[category]) || Award;
