import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";

import { CommunityAvatar } from "@/components/workspace-groups/CommunityAvatar";
import { JoinCommunityButton } from "@/components/workspace-groups/JoinCommunityButton";
import { formatRelativeTime } from "@/utils/date-utils";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";

interface CommunityRowProps {
  community: Community;
  onMembershipChange?: (id: string, patch: Partial<Community>) => void;
}

/**
 * CommunityRow - Clean destination row for the Groups directory.
 *
 * Emphasizes that each group is a student workspace. Icon is the anchor,
 * titles are crisp, and member/activity stats are displayed calmly inline.
 */
export function CommunityRow({ community, onMembershipChange }: CommunityRowProps) {
  const kind = getCommunityKindMeta(community.kind);
  const isPrivate = community.visibility === "private";

  return (
    <div className="group relative flex min-w-0 flex-col justify-between gap-4 rounded-lg border bg-card p-4 shadow-card transition-colors duration-150 hover:border-foreground/20 sm:flex-row sm:items-center">
      {/* Main destination click area */}
      <Link
        to={`/workspace-groups/${community.slug}`}
        className="flex min-w-0 flex-1 items-start gap-3.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Avatar */}
        <CommunityAvatar
          kind={community.kind}
          name={community.name}
          coverImage={community.cover_image}
          className="h-11 w-11 shrink-0 rounded-lg border bg-muted"
          iconClassName="h-5 w-5 text-muted-foreground"
        />

        <div className="min-w-0 flex-1 space-y-1">
          {/* Header row: Name + Category & Access inline */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-foreground underline-offset-4 group-hover:underline">
              {community.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{kind.label}</span>
              <span aria-hidden>·</span>
              {isPrivate ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Invite only
                </span>
              ) : (
                <span>Open</span>
              )}
            </div>
          </div>

          {/* Description line */}
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {community.description || "No description yet."}
          </p>

          {/* Secondary stats row */}
          <div className="tabular flex min-w-0 items-center gap-2 pt-0.5 text-xs text-muted-foreground">
            <span>{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
            <span aria-hidden>·</span>
            <span>Active {formatRelativeTime(community.last_activity_at)}</span>
            <span aria-hidden>·</span>
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              Run by {community.owner.name}
            </span>
          </div>
        </div>
      </Link>

      {/* Action CTA & Join button */}
      <div className="flex shrink-0 items-center justify-between gap-2.5 border-t pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
        <div onClick={(e) => e.stopPropagation()}>
          <JoinCommunityButton community={community} onJoined={onMembershipChange} />
        </div>

        <Link
          to={`/workspace-groups/${community.slug}`}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-accent"
        >
          Open
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default CommunityRow;
