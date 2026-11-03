/**
 * CardAccentBorder
 *
 * A thin full-width strip rendered as an absolutely-positioned div at the
 * top of any card that has `relative overflow-hidden`.
 *
 * Flat, one colour per key. It used to be a three-stop gradient per hue,
 * which on a feed of cards read as decoration rather than as the category
 * marker it is meant to be. The prop is still called `gradient` so existing
 * call sites keep compiling.
 *
 * Usage:
 *   <Card className="relative overflow-hidden ...">
 *     <CardAccentBorder gradient="rose" />
 *     ...content...
 *   </Card>
 */

const GRADIENT_MAP: Record<string, string> = {
  rose:    "bg-rose-500",
  emerald: "bg-emerald-500",
  amber:   "bg-amber-500",
  gold:    "bg-amber-400",
  violet:  "bg-violet-500",
  sky:     "bg-sky-500",
  orange:  "bg-orange-500",
  primary: "bg-primary",
  muted:   "bg-border",
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
      className={`absolute top-0 left-0 w-full h-[2px] opacity-60 ${colors} ${className}`}
    />
  );
}

export default CardAccentBorder;
