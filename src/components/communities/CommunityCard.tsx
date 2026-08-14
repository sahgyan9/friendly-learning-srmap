import { Link } from "react-router-dom";
import { Globe, Lock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
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
 * CommunityCard - Card representation of a group / community for multi-column grids.
 * 
 * Styled according to brand guidelines with CardAccentBorder, responsive flex header,
 * proper description truncation, and a clean card footer housing metadata and action CTA.
 */
export function CommunityCard({ community, onMembershipChange }: CommunityCardProps) {
  const kind = getCommunityKindMeta(community.kind);
  const style = getKindStyle(community.kind);

  return (
    <article className="group relative flex flex-col justify-between h-full rounded-xl border border-border/70 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md overflow-hidden">
      {/* Accent border top strip */}
      <CardAccentBorder gradient={style.gradient} />

      {/* Hover glow overlay */}
      <div className={`pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${style.hoverGlow}`} />

      {/* Main destination click area */}
      <Link
        to={`/workspace-groups/${community.slug}`}
        aria-label={`Open ${community.name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring z-0"
      />

      <div className="relative z-10 space-y-3">
        {/* Top Header Row: Icon + Title & Badges */}
        <div className="flex items-start gap-3">
          <CommunityAvatar
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className={`h-11 w-11 shrink-0 rounded-xl ring-1 ring-border transition-transform duration-200 ${style.avatarRing} group-hover:scale-105`}
            iconClassName="h-5.5 w-5.5"
          />

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-base leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
              {community.name}
            </h3>

            {/* Sub-header badges */}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${style.pill}`}>
                <kind.icon className="h-3 w-3 shrink-0" aria-hidden />
                {kind.label}
              </span>

              {community.visibility === "private" ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground text-[10px] font-medium py-0 px-1.5 h-5 shrink-0">
                  <Lock className="h-2.5 w-2.5 shrink-0" />
                  Invite only
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-green-500/30 text-green-700 text-[10px] font-medium py-0 px-1.5 h-5 dark:text-green-400 shrink-0"
                >
                  <Globe className="h-2.5 w-2.5 shrink-0" />
                  Open
                </Badge>
              )}

              {community.viewer_has_invite && !community.viewer_is_member && (
                <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-medium py-0 px-1.5 h-5 shrink-0">
                  Invited
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground min-h-[2.5rem]">
          {community.description || "No description available."}
        </p>
      </div>

      {/* Footer: Metadata & Action CTA */}
      <div className="relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-[11px] min-w-0">
          <span className="inline-flex items-center gap-1 shrink-0 font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {community.member_count}
          </span>
          <span aria-hidden className="text-border">·</span>
          <span className="truncate">
            Active {formatRelativeTime(community.last_activity_at)}
          </span>
        </div>

        <div className="shrink-0">
          <JoinCommunityButton community={community} onJoined={onMembershipChange} />
        </div>
      </div>
    </article>
  );
}

export default CommunityCard;
