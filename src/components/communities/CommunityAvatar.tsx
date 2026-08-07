import { cn } from "@/lib/utils";
import { getCommunityKindMeta } from "@/integrations/supabase/services/communities";

/**
 * A group's icon.
 *
 * Borrowed straight from Discord, where every server is a rounded square in the
 * left rail and you learn to find yours by its colour long before you read its
 * name. A wall of identically-styled cards has no such handle — every group
 * looks like every other group, and the eye has to read all of them.
 *
 * No upload, no storage, no migration: the colour is derived from the slug, so
 * a group's icon is fixed from the moment it is named and is the same on every
 * device and for every visitor. `cover_image` wins when a group has one, which
 * leaves room for real uploads later without changing anything here.
 */

/**
 * Twelve hues spread evenly round the wheel, avoiding the 340–20 range so a
 * group never reads as an error state. Saturation and lightness are fixed so
 * white text stays legible on all of them, in either theme.
 */
const HUES = [8, 32, 52, 96, 140, 168, 190, 212, 240, 266, 292, 320];

/**
 * djb2. Any stable hash would do; what matters is that it never changes, since
 * a group quietly switching colour on a redeploy would be worse than not having
 * one at all.
 */
function hashOf(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface CommunityAvatarProps {
  /** The stable identity. Slug rather than name, which the owner can edit. */
  slug: string;
  kind: string;
  name: string;
  coverImage?: string | null;
  className?: string;
  /** Icon size. Tailwind h-/w- classes. */
  iconClassName?: string;
}

export function CommunityAvatar({
  slug,
  kind,
  name,
  coverImage,
  className,
  iconClassName = "h-5 w-5",
}: CommunityAvatarProps) {
  const meta = getCommunityKindMeta(kind);
  const hue = HUES[hashOf(slug) % HUES.length];

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
        "ring-1 ring-inset ring-white/15",
        className,
      )}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 62% 46%), hsl(${(hue + 24) % 360} 58% 38%))`,
      }}
    >
      <meta.icon className={cn("text-white", iconClassName)} strokeWidth={2} />
    </span>
  );
}

export default CommunityAvatar;
