import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Users } from "lucide-react";

import { getCommunityBySlug, type Community } from "@/integrations/supabase/services/communities";
import { JoinCommunityButton } from "@/components/workspace-groups/JoinCommunityButton";

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
 * Replaces a pasted /communities/:slug link with a group preview: name,
 * privacy, member count and a Join / Request to join button, so the reader
 * can act without leaving the conversation.
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

  // If community failed to load or does not exist, fall back to plain link
  if (community === null) {
    return (
      <Link
        to={`/communities/${slug}`}
        className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {label}
      </Link>
    );
  }

  return (
    <div
      className="my-2.5 flex w-full min-w-0 flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
          {community?.cover_image ? (
            <img src={community.cover_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Users className="h-5 w-5" aria-hidden />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            to={`/communities/${slug}`}
            className="truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {community ? community.name : slug}
          </Link>

          {community === undefined ? (
            <span className="h-3.5 w-40 max-w-full animate-pulse rounded bg-muted" aria-label="Loading group details" />
          ) : (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-flex shrink-0 items-center gap-1">
                {community.visibility === "private" && <Lock className="h-3 w-3" aria-hidden />}
                {community.visibility === "private" ? "Private" : "Public"}
              </span>
              <span aria-hidden>·</span>
              <span className="tabular shrink-0">
                {community.member_count} {community.member_count === 1 ? "member" : "members"}
              </span>
              {community.description && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{community.description}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {community === undefined ? (
        <span className="h-9 w-full animate-pulse rounded-md bg-muted sm:w-24" />
      ) : (
        <JoinCommunityButton
          community={community}
          size="sm"
          className="w-full shrink-0 justify-center sm:w-auto"
          onJoined={(_, patch) => setCommunity((prev) => (prev ? { ...prev, ...patch } : prev))}
        />
      )}
    </div>
  );
}

export default CommunityLinkPreview;

