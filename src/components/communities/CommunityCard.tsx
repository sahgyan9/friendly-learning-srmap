import { Link } from "react-router-dom";
import { ArrowRight, Globe, Lock, MessageSquare, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { JoinCommunityButton } from "@/components/communities/JoinCommunityButton";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";
import { getKindStyle } from "@/integrations/supabase/services/community-kind-styles";

interface CommunityCardProps {
  community: Community;
  /** Lets the grid update this one card after a join, instead of reloading. */
  onMembershipChange?: (id: string, patch: Partial<Community>) => void;
}

/**
 * The card is no longer one big link.
 *
 * It used to wrap everything in an <a>, which is fine until there is a Join
 * button inside it: a <button> nested in an <a> is invalid HTML, and browsers
 * resolve it by following the link on click, so joining would have navigated
 * away instead. The link now covers the reading part — icon, title, description
 * — and the footer, which holds the action, sits outside it.
 */
export function CommunityCard({ community, onMembershipChange }: CommunityCardProps) {
  const kind = getCommunityKindMeta(community.kind);
  const style = getKindStyle(community.kind);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30">
      {/* Solid full-width accent border — colour tracks the community kind */}
      <CardAccentBorder gradient={style.gradient} />

      {/* Hover glow — colour tracks the community kind */}
      <div className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${style.hoverGlow}`} />

      <Link
        to={`/communities/${community.slug}`}
        className="relative flex flex-1 flex-col gap-3 rounded-t-xl p-5 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Header: avatar + name + kind */}
        <div className="flex items-start gap-3">
          <CommunityAvatar
            slug={community.slug}
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className={`h-12 w-12 ring-2 ring-border ${style.avatarRing} transition-all duration-300`}
            emojiClassName="text-xl"
          />

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-base leading-snug transition-colors duration-200 group-hover:text-primary">
              {community.name}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
              {/* Kind pill — colour matches the card's accent gradient */}
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 ${style.pill}`}>
                <span aria-hidden>{kind.emoji}</span>
                {kind.label}
              </span>
              <span className="truncate text-xs text-muted-foreground min-w-0 flex-1" title={community.owner.name}>
                · {community.owner.name}
              </span>
            </div>
          </div>
        </div>

        {/* Privacy / invite badges — always shown, not just for private
            groups, so open-vs-invite-only is never left to be inferred from
            which button happens to be in the footer. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {community.visibility === "private" ? (
            <Badge variant="outline" className="gap-1 text-muted-foreground text-[11px] font-medium py-0.5">
              <Lock className="h-3 w-3 shrink-0" />
              Invite only
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-green-500/30 text-green-700 text-[11px] font-medium py-0.5 dark:text-green-400"
            >
              <Globe className="h-3 w-3 shrink-0" />
              Open · anyone can join
            </Badge>
          )}
          {community.viewer_has_invite && !community.viewer_is_member && (
            <Badge variant="outline" className="border-primary/40 text-primary text-[11px] font-medium py-0.5">
              You're invited
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {community.description}
        </p>

        {/* View link — secondary CTA uses kind accent colour */}
        <div className={`inline-flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 -mb-1 ${style.cta}`}>
          View group
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Link>

      {/* Footer stats + join */}
      <div className="relative flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <strong className="text-foreground">{community.member_count}</strong>
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            <strong className="text-foreground">{community.post_count}</strong>
          </span>
        </div>

        <JoinCommunityButton community={community} onJoined={onMembershipChange} />
      </div>
    </Card>
  );
}

export default CommunityCard;
