import { Link } from "react-router-dom";
import { ArrowRight, Clock, Globe, Lock, MessageSquare, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { JoinCommunityButton } from "@/components/communities/JoinCommunityButton";
import { formatRelativeTime } from "@/utils/date-utils";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";
import { getKindStyle } from "@/integrations/supabase/services/community-kind-styles";

interface CommunityRowProps {
  community: Community;
  onMembershipChange?: (id: string, patch: Partial<Community>) => void;
}

/**
 * Notion / Linear-style destination row for the Groups directory.
 *
 * Emphasizes that each group is a workspace / place rather than a product card.
 * Icon is the hero, specs are scannable, and member/discussion stats are displayed inline.
 */
export function CommunityRow({ community, onMembershipChange }: CommunityRowProps) {
  const kind = getCommunityKindMeta(community.kind);
  const style = getKindStyle(community.kind);

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-accent/30 hover:shadow-sm">
      {/* Accent border top strip */}
      <CardAccentBorder gradient={style.gradient} />

      {/* Main destination click area */}
      <Link
        to={`/communities/${community.slug}`}
        className="flex flex-1 items-start gap-4 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        {/* Hero icon avatar */}
        <CommunityAvatar
          kind={community.kind}
          name={community.name}
          coverImage={community.cover_image}
          className={`h-12 w-12 shrink-0 rounded-xl ring-1 ring-border ${style.avatarRing} transition-transform duration-200 group-hover:scale-105`}
          iconClassName="h-6 w-6"
        />

        <div className="min-w-0 flex-1 space-y-1">
          {/* Header row: Name + Category badge + Privacy badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-base text-foreground transition-colors duration-200 group-hover:text-primary truncate">
              {community.name}
            </h3>

            {/* Category pill */}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0 ${style.pill}`}>
              <kind.icon className="h-3 w-3 shrink-0" aria-hidden />
              {kind.label}
            </span>

            {/* Privacy indicator */}
            {community.visibility === "private" ? (
              <Badge variant="outline" className="gap-1 text-muted-foreground text-[10px] font-medium py-0 px-2 h-5">
                <Lock className="h-2.5 w-2.5 shrink-0" />
                Invite only
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-green-500/30 text-green-700 text-[10px] font-medium py-0 px-2 h-5 dark:text-green-400"
              >
                <Globe className="h-2.5 w-2.5 shrink-0" />
                Open
              </Badge>
            )}

            {community.viewer_has_invite && !community.viewer_is_member && (
              <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-medium py-0 px-2 h-5">
                You're invited
              </Badge>
            )}
          </div>

          {/* Description line */}
          <p className="line-clamp-1 text-xs text-muted-foreground leading-relaxed">
            {community.description}
          </p>

          {/* Secondary stats row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
            <span className="truncate max-w-[140px] sm:max-w-[200px]">
              Run by <span className="font-medium text-foreground">{community.owner.name}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <strong className="text-foreground font-medium">{community.member_count}</strong> members
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Active {formatRelativeTime(community.last_activity_at)}
            </span>
          </div>
        </div>
      </Link>

      {/* Action CTA & Join button */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
        <JoinCommunityButton community={community} onJoined={onMembershipChange} />

        <Link
          to={`/communities/${community.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline group-hover:translate-x-0.5 transition-transform duration-200"
        >
          <span>Enter</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default CommunityRow;
