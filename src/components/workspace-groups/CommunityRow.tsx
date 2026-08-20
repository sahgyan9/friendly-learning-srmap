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
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-accent/20 hover:shadow-xs">
      {/* Main destination click area */}
      <Link
        to={`/workspace-groups/${community.slug}`}
        className="flex flex-1 items-start gap-3.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        {/* Avatar */}
        <CommunityAvatar
          kind={community.kind}
          name={community.name}
          coverImage={community.cover_image}
          className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-border/80 bg-muted/60 transition-transform duration-200 group-hover:scale-105"
          iconClassName="h-5 w-5 text-muted-foreground"
        />

        <div className="min-w-0 flex-1 space-y-1">
          {/* Header row: Name + Category & Access inline */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-base text-foreground transition-colors duration-200 group-hover:text-primary truncate">
              {community.name}
            </h3>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>{kind.label}</span>
              <span aria-hidden className="text-border">·</span>
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
          <p className="line-clamp-1 text-xs text-muted-foreground leading-relaxed">
            {community.description || "Campus group for collaboration and discussions."}
          </p>

          {/* Secondary stats row */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5 font-medium">
            <span>{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
            <span aria-hidden className="text-border">·</span>
            <span>Active {formatRelativeTime(community.last_activity_at)}</span>
            <span aria-hidden className="text-border">·</span>
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              Run by {community.owner.name}
            </span>
          </div>
        </div>
      </Link>

      {/* Action CTA & Join button */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
        <div onClick={(e) => e.stopPropagation()}>
          <JoinCommunityButton community={community} onJoined={onMembershipChange} />
        </div>

        <Link
          to={`/workspace-groups/${community.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group-hover:translate-x-0.5 transition-transform duration-200 pl-1"
        >
          <span>Enter</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default CommunityRow;
