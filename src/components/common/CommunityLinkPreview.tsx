import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { getCommunityBySlug, type Community } from "@/integrations/supabase/services/communities";
import { JoinCommunityButton } from "@/components/communities/JoinCommunityButton";

// Pasted invite links are the whole point of this feature, so the same slug
// can show up in dozens of posts and comments on one page. One fetch per
// slug per page load is plenty — membership doesn't change fast enough to
// need a refetch every time the link is re-rendered.
const communityCache = new Map<string, Promise<Community | null>>();

function loadCommunity(slug: string): Promise<Community | null> {
  let cached = communityCache.get(slug);
  if (!cached) {
    cached = getCommunityBySlug(slug).then(({ data }) => data);
    communityCache.set(slug, cached);
  }
  return cached;
}

interface CommunityLinkPreviewProps {
  slug: string;
  label: string;
}

/**
 * Replaces a pasted /communities/:slug link with the same live Join / Ask to
 * join button the group's own page uses, instead of leaving it as a plain
 * blue link someone has to tap through to act on.
 *
 * A slug that doesn't resolve (typo, deleted group) just leaves the link
 * plain — silently, since nothing here is asserting the link is broken, only
 * that it declined to add a button it can't back up.
 */
export function CommunityLinkPreview({ slug, label }: CommunityLinkPreviewProps) {
  const [community, setCommunity] = useState<Community | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadCommunity(slug).then((data) => {
      if (!cancelled) setCommunity(data);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <span
      className="inline-flex flex-wrap items-center gap-1.5 align-middle"
      onClick={(event) => event.stopPropagation()}
    >
      <Link
        to={`/communities/${slug}`}
        className="text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400"
      >
        {label}
      </Link>
      {community === undefined && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-hidden />
      )}
      {community && (
        <JoinCommunityButton
          community={community}
          size="sm"
          className="h-6 px-2 text-xs"
          onJoined={(_, patch) => setCommunity((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}
    </span>
  );
}

export default CommunityLinkPreview;
