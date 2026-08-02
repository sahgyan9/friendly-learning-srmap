import { Link } from "react-router-dom";
import { Lock, MessageSquare, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { JoinCommunityButton } from "@/components/communities/JoinCommunityButton";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";

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

  return (
    <Card className="group flex h-full flex-col transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        to={`/communities/${community.slug}`}
        className="flex flex-1 flex-col gap-3 rounded-t-xl p-5 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-start gap-3">
          <CommunityAvatar
            slug={community.slug}
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className="h-11 w-11"
            emojiClassName="text-lg"
          />

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold leading-snug group-hover:text-primary">
              {community.name}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {kind.label} · {community.owner.name}
            </p>
          </div>
        </div>

        {/* Stated plainly so nobody clicks through expecting to read the posts.
            Muted, not alarming — the group is still listed and still joinable,
            just not instantly. */}
        {(community.visibility === "private" || community.viewer_has_invite) && (
          <div className="flex flex-wrap gap-2">
            {community.visibility === "private" && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                Invite only
              </Badge>
            )}
            {community.viewer_has_invite && !community.viewer_is_member && (
              <Badge variant="outline" className="border-primary/40 text-primary">
                You're invited
              </Badge>
            )}
          </div>
        )}

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {community.description}
        </p>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {community.member_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {community.post_count}
          </span>
        </div>

        <JoinCommunityButton community={community} onJoined={onMembershipChange} />
      </div>
    </Card>
  );
}

export default CommunityCard;
