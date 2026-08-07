/**
 * CardAccentBorder
 *
 * A thin full-width gradient strip rendered as an absolutely-positioned div
 * at the top of any card that has `relative overflow-hidden`.
 *
 * Inspired by the DynamicGradientBorder pattern in portfolio-insight:
 * instead of a fading CSS border, this renders a true solid gradient that
 * runs edge-to-edge across the full card width.
 *
 * Usage:
 *   <Card className="relative overflow-hidden ...">
 *     <CardAccentBorder gradient="rose" />
 *     ...content...
 *   </Card>
 */

const GRADIENT_MAP: Record<string, string> = {
  rose:    "from-rose-400 via-rose-500 to-pink-500",
  emerald: "from-emerald-400 via-emerald-500 to-teal-500",
  amber:   "from-amber-400 via-orange-400 to-amber-500",
  gold:    "from-yellow-300 via-amber-400 to-yellow-500",
  violet:  "from-violet-400 via-purple-500 to-violet-500",
  sky:     "from-sky-400 via-blue-400 to-cyan-400",
  orange:  "from-orange-400 via-amber-500 to-orange-500",
  primary: "from-blue-400 via-indigo-500 to-blue-500",
  muted:   "from-border via-border to-border",
};

interface CardAccentBorderProps {
  gradient?: keyof typeof GRADIENT_MAP;
  className?: string;
}

export function CardAccentBorder({
  gradient = "primary",
  className = "",
}: CardAccentBorderProps) {
  const colors = GRADIENT_MAP[gradient] ?? GRADIENT_MAP.primary;

  return (
    <div
      className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r opacity-40 ${colors} ${className}`}
    />
  );
}

export default CardAccentBorder;
