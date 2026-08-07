import { Link } from "react-router-dom";
import { Globe, Lock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { JoinCommunityButton } from "@/components/communities/JoinCommunityButton";
import { formatRelativeTime } from "@/utils/date-utils";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";
import { getKindStyle } from "@/integrations/supabase/services/community-kind-styles";

interface CommunityCardProps {
  community: Community;
  /** Lets the list update this one row after a join, instead of reloading. */
  onMembershipChange?: (id: string, patch: Partial<Community>) => void;
}

/**
 * A row, not a card.
 *
 * As a grid of cards this looked exactly like the post cards, the mentor cards
 * and everything else on the site — which taught people to skim past it, when a
 * group is the one thing here that is a place rather than a piece of content.
 * A full-width row with the icon as the hero reads as a directory of rooms and
 * scans about three times faster.
 *
 * The whole row is clickable via a stretched overlay link rather than by
 * wrapping everything in an <a>. That is what keeps the Join button working: a
 * <button> nested inside an <a> is invalid HTML, and browsers resolve it by
 * following the link, so joining used to navigate away instead.
 */
export function CommunityCard({ community, onMembershipChange }: CommunityCardProps) {
  const kind = getCommunityKindMeta(community.kind);
  const style = getKindStyle(community.kind);

  return (
    <article className="group relative rounded-xl border bg-card p-4 transition-colors duration-200 hover:border-primary/30 hover:bg-accent/30">
      <Link
        to={`/communities/${community.slug}`}
        aria-label={`Open ${community.name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {/* Side by side once there is room for it. On a phone the action drops to
          its own line instead: "Sign in to join" is a wide button, and keeping
          it in the row left the name with about 90px and truncated it to
          "hackthon ...". */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {/* The icon carries the group's identity — the one thing that makes
              "Battery Technology" and "Drama Club" instantly distinguishable. */}
          <CommunityAvatar
            slug={community.slug}
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className={`h-14 w-14 shrink-0 ring-2 ring-border transition-all duration-300 ${style.avatarRing}`}
            iconClassName="h-6 w-6"
          />

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold leading-snug transition-colors duration-200 group-hover:text-primary">
              {community.name}
            </h2>

            {/* One line of plain text instead of a row of pills. Pills gave
                five unrelated facts the same visual weight and wrapped on
                narrow screens; this reads left to right. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 font-semibold ${style.cta}`}>
                <kind.icon className="h-3 w-3 shrink-0" aria-hidden />
                {kind.label}
              </span>

              <span aria-hidden>·</span>
              {community.visibility === "private" ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 shrink-0" />
                  Invite only
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                  <Globe className="h-3 w-3 shrink-0" />
                  Open
                </span>
              )}

              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                {community.member_count}
              </span>

              {/* Recency rather than a post total: whether anyone is still
                  here is the question someone browsing is actually asking. */}
              <span aria-hidden>·</span>
              <span>Active {formatRelativeTime(community.last_activity_at)}</span>

              {community.viewer_has_invite && !community.viewer_is_member && (
                <Badge
                  variant="outline"
                  className="border-primary/40 py-0 text-[10px] font-medium text-primary"
                >
                  You're invited
                </Badge>
              )}
            </div>

            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {community.description}
            </p>
          </div>
        </div>

        {/* Above the stretched link, so the button is the button. Indented on
            mobile to line up with the text column rather than the icon. */}
        <div className="relative z-10 shrink-0 pl-[4.5rem] sm:pl-0">
          <JoinCommunityButton community={community} onJoined={onMembershipChange} />
        </div>
      </div>
    </article>
  );
}

export default CommunityCard;
