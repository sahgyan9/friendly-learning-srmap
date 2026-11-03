import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

import { CommunityAvatar } from "@/components/workspace-groups/CommunityAvatar";
import { JoinCommunityButton } from "@/components/workspace-groups/JoinCommunityButton";
import { formatRelativeTime } from "@/utils/date-utils";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";

interface CommunityCardProps {
  community: Community;
  /** Lets the list update this one row after a join, instead of reloading. */
  onMembershipChange?: (id: string, patch: Partial<Community>) => void;
}

/**
 * CommunityCard - First-principles university community discovery card.
 *
 * Visual hierarchy:
 * 1. Community Identity (Avatar + Title)
 * 2. Community Type & Access (Subtle secondary line)
 * 3. Purpose (1–2 concise lines)
 * 4. Social proof & activity (Member count · Active time)
 * 5. Action (Clean Join CTA)
 */
export function CommunityCard({ community, onMembershipChange }: CommunityCardProps) {
  const kind = getCommunityKindMeta(community.kind);
  const isPrivate = community.visibility === "private";

  return (
    <article className="group relative flex h-full min-w-0 flex-col justify-between rounded-lg border bg-card p-5 shadow-card transition-colors duration-150 hover:border-foreground/20">
      {/* Upper Area: Clickable Destination */}
      <Link
        to={`/workspace-groups/${community.slug}`}
        aria-label={`Open ${community.name}`}
        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Header & Body: Avatar + Content Column (Title, Type, and Description aligned) */}
        <div className="flex items-start gap-3.5">
          <CommunityAvatar
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className="h-11 w-11 shrink-0 rounded-lg border bg-muted"
            iconClassName="h-5 w-5 text-muted-foreground"
          />

          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="truncate text-base font-semibold leading-tight text-foreground underline-offset-4 group-hover:underline">
              {community.name}
            </h3>

            {/* Subtle secondary type & privacy metadata */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{kind.label}</span>
              <span aria-hidden>·</span>
              {isPrivate ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Invite only
                </span>
              ) : (
                <span className="text-muted-foreground">Open</span>
              )}
            </div>

            {/* Concise 2-line Purpose Description - perfectly aligned with title & category */}
            <p className="line-clamp-2 min-h-[2.5rem] pt-1 text-sm leading-relaxed text-muted-foreground">
              {community.description || "No description yet."}
            </p>
          </div>
        </div>
      </Link>

      {/* Footer: Social Proof + Action CTA */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3.5 text-xs text-muted-foreground">
        <Link
          to={`/workspace-groups/${community.slug}`}
          tabIndex={-1}
          className="tabular flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground"
        >
          <span>{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
          <span aria-hidden>·</span>
          <span className="truncate">Active {formatRelativeTime(community.last_activity_at)}</span>
        </Link>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <JoinCommunityButton community={community} onJoined={onMembershipChange} />
        </div>
      </div>
    </article>
  );
}

export default CommunityCard;
