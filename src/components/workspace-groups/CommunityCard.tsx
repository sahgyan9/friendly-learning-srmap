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
    <article className="group relative flex flex-col justify-between h-full rounded-2xl border border-border/70 bg-card p-4.5 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md cursor-pointer">
      {/* Upper Area: Clickable Destination */}
      <Link
        to={`/workspace-groups/${community.slug}`}
        aria-label={`Open ${community.name}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        {/* Header: Avatar + Title & Type Subtitle */}
        <div className="flex items-start gap-3">
          <CommunityAvatar
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-border/80 bg-muted/60 transition-transform duration-200 group-hover:scale-105"
            iconClassName="h-5 w-5 text-muted-foreground"
          />

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-base leading-tight text-foreground transition-colors duration-200 group-hover:text-primary">
              {community.name}
            </h3>

            {/* Subtle secondary type & privacy metadata */}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>{kind.label}</span>
              <span aria-hidden className="text-border">·</span>
              {isPrivate ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Invite only
                </span>
              ) : (
                <span className="text-muted-foreground">Open</span>
              )}
            </div>
          </div>
        </div>

        {/* Concise 2-line Purpose Description */}
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground min-h-[2.5rem]">
          {community.description || "Campus group for collaboration and discussions."}
        </p>
      </Link>

      {/* Footer: Social Proof + Action CTA */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3.5 text-xs text-muted-foreground">
        <Link
          to={`/workspace-groups/${community.slug}`}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-w-0 truncate"
        >
          <span>{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
          <span aria-hidden className="text-border">·</span>
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
