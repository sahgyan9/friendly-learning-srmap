import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Lock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
 * Replaces a pasted /communities/:slug link with a rich, impossible-to-miss
 * group preview card with group branding, member count, privacy badge, and
 * a prominent Join / Request to Join button.
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
        className="text-blue-600 underline decoration-blue-600/40 underline-offset-2 hover:decoration-blue-600 dark:text-blue-400"
      >
        {label}
      </Link>
    );
  }

  return (
    <div
      className="my-2.5 block w-full overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-3 shadow-sm transition-all duration-300 hover:border-emerald-500/50 hover:shadow-md dark:from-emerald-950/40 dark:via-emerald-950/20 dark:border-emerald-500/40"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-col gap-2.5">
        {/* Group Info Header Row */}
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/15 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 shadow-inner">
            {community?.cover_image ? (
              <img
                src={community.cover_image}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/communities/${slug}`}
                className="font-semibold text-sm text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors truncate max-w-full"
              >
                {community ? community.name : slug}
              </Link>

              {community?.visibility === "private" ? (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium shrink-0"
                >
                  <Lock className="w-2.5 h-2.5 mr-0.5 inline" /> Private
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium shrink-0"
                >
                  Public
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1">
              {community ? (
                <>
                  <span className="font-medium text-foreground">
                    {community.member_count} {community.member_count === 1 ? "member" : "members"}
                  </span>
                  {community.description ? ` • ${community.description}` : ""}
                </>
              ) : (
                "Loading group details..."
              )}
            </p>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center justify-end pt-1.5 border-t border-emerald-500/15">
          {community === undefined ? (
            <div className="flex items-center gap-2 h-8 px-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
              <span>Loading...</span>
            </div>
          ) : (
            <JoinCommunityButton
              community={community}
              size="sm"
              className="w-full sm:w-auto h-8 px-3.5 text-xs font-semibold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-transform active:scale-95 justify-center"
              onJoined={(_, patch) => setCommunity((prev) => (prev ? { ...prev, ...patch } : prev))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CommunityLinkPreview;

