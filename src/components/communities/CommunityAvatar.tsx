import { cn } from "@/lib/utils";
import { getCommunityKindMeta } from "@/integrations/supabase/services/communities";

/**
 * A group's icon.
 *
 * Falls back to a flat outline glyph for the group's kind — the same
 * monochrome, single-colour-icon language as the site nav — rather than a
 * colour hashed from the slug. That earlier per-group colour was meant as a
 * "spot yours in the list" cue, but it fought with every other colourful
 * badge on the page instead of reading as identity. `cover_image` wins when a
 * group has a real icon, which leaves room for uploads without changing
 * anything here.
 */

interface CommunityAvatarProps {
  kind: string;
  name: string;
  coverImage?: string | null;
  className?: string;
  /** Icon size. Tailwind h-/w- classes. */
  iconClassName?: string;
}

export function CommunityAvatar({
  kind,
  name,
  coverImage,
  className,
  iconClassName = "h-5 w-5",
}: CommunityAvatarProps) {
  const meta = getCommunityKindMeta(kind);

  if (coverImage) {
    return (
      <img
        src={coverImage}
        alt=""
        className={cn("h-12 w-12 shrink-0 rounded-xl object-cover", className)}
      />
    );
  }

  return (
    <span
      // Decorative: the group's name is always next to it in the markup, and a
      // screen reader announcing "hackathon icon" before it adds nothing.
      aria-hidden
      title={name}
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
        "bg-muted ring-1 ring-inset ring-border",
        className,
      )}
    >
      <meta.icon className={cn("text-muted-foreground", iconClassName)} strokeWidth={2} />
    </span>
  );
}

export default CommunityAvatar;
