import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";

/**
 * A mentor's picture, or their initials when there isn't one.
 *
 * The profile page used to render a bare `<img src={mentor.profile_image}>`.
 * That field is optional, so every mentor who had not uploaded a photo got the
 * browser's broken-image icon with their name spilling out of it as alt text —
 * the first thing a visitor saw on the page.
 */

/**
 * Initials on one shared blue read as "the site failed to load six photos".
 * Keying the tint off the user id instead gives each person a stable colour,
 * which is enough for a returning visitor to recognise a mentor in the grid
 * before they have read the name.
 */
const TINTS = [
  "bg-blue-600 text-white",
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-cyan-600 text-white",
];

const tintFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return TINTS[Math.abs(hash) % TINTS.length];
};

interface MentorAvatarProps {
  name: string;
  src?: string | null;
  /** Usually the mentor id, so the colour survives a rename. */
  seed?: string;
  className?: string;
  fallbackClassName?: string;
}

const MentorAvatar = ({ name, src, seed, className, fallbackClassName }: MentorAvatarProps) => {
  const optimizedSrc = src ? getOptimizedImageUrl(src, { width: 160, quality: 80 }) : undefined;

  return (
    <Avatar className={cn("h-16 w-16", className)}>
      {/* Radix only swaps in the fallback once the image errors or is absent, so
          an empty string has to be normalised to undefined — "" would otherwise
          resolve against the current URL and load the HTML document. */}
      <AvatarImage src={optimizedSrc || undefined} alt={name} loading="lazy" />
      <AvatarFallback className={cn("font-semibold", tintFor(seed || name), fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default MentorAvatar;
