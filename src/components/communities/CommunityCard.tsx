import { Link } from "react-router-dom";
import { MessageSquare, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils/user-utils";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const kind = getCommunityKindMeta(community.kind);

  return (
    <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/communities/${community.slug}`} className="flex h-full flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <span aria-hidden>{kind.emoji}</span>
            {kind.label}
          </Badge>
          {community.viewer_is_owner ? (
            <Badge variant="outline">You run this</Badge>
          ) : community.viewer_is_member ? (
            <Badge variant="outline">Joined</Badge>
          ) : null}
        </div>

        <h2 className="font-semibold leading-snug group-hover:text-primary">{community.name}</h2>

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {community.description}
        </p>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={community.owner.profile_image ?? undefined} alt="" />
              <AvatarFallback className="text-[10px]">
                {getInitials(community.owner.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">{community.owner.name}</span>
          </div>

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
        </div>
      </Link>
    </Card>
  );
}

export default CommunityCard;
