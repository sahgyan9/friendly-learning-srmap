import { cn } from "@/lib/utils";
import { getCommunityKindMeta } from "@/integrations/supabase/services/communities";

/**
 * CommunityAvatar - Scaled, contained avatar for groups and clubs.
 *
 * Guaranteed strict dimensional containment so uploaded cover images never
 * expand beyond the allocated container.
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
        alt={name}
        className={cn(
          "h-11 w-11 shrink-0 rounded-xl object-cover aspect-square ring-1 ring-border/80 bg-muted/60",
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        "bg-muted/60 ring-1 ring-inset ring-border/80 aspect-square",
        className,
      )}
    >
      <meta.icon className={cn("text-muted-foreground", iconClassName)} strokeWidth={2} />
    </span>
  );
}

export default CommunityAvatar;
