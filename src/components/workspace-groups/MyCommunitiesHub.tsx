import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  Lock,
  Pin,
  Plus,
  ChevronRight,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityAvatar } from "@/components/workspace-groups/CommunityAvatar";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
import { formatRelativeTime } from "@/utils/date-utils";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";
import { useCommunityPreferences } from "@/hooks/useCommunityPreferences";
import { cn } from "@/lib/utils";

interface MyCommunitiesHubProps {
  myCommunities: Community[];
  onMembershipChange: (id: string, patch: Partial<Community>) => void;
  onExploreDiscovery: () => void;
  onStartGroup: () => void;
}

export function MyCommunitiesHub({
  myCommunities,
  onMembershipChange,
  onExploreDiscovery,
  onStartGroup,
}: MyCommunitiesHubProps) {
  const { togglePin, isPinned, hasUnread } = useCommunityPreferences();

  // Sort: Pinned first, then by last_activity_at descending
  const sortedCommunities = useMemo(() => {
    return [...myCommunities].sort((a, b) => {
      const aPinned = isPinned(a.id);
      const bPinned = isPinned(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aTime = new Date(a.last_activity_at || a.created_at).getTime();
      const bTime = new Date(b.last_activity_at || b.created_at).getTime();
      return bTime - aTime;
    });
  }, [myCommunities, isPinned]);

  if (myCommunities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex max-w-md flex-col gap-1">
          <h3 className="text-lg font-semibold tracking-tight">You have not joined a community yet</h3>
          <p className="text-sm text-muted-foreground">
            Join a hackathon team, a department club or a study group, or start your own.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onExploreDiscovery}>
            <Compass className="h-4 w-4" />
            Browse communities
          </Button>
          <Button onClick={onStartGroup} variant="outline">
            <Plus className="h-4 w-4" />
            Start a group
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="quick-jump" className="flex flex-col gap-2.5">
        <h2 id="quick-jump" className="text-sm font-medium text-muted-foreground">
          Jump to
        </h2>

        <HorizontalScroller className="flex items-center gap-2 px-0.5 py-1" ariaLabel="Jump to a community">
          {sortedCommunities.map((community) => {
            const pinned = isPinned(community.id);
            const unread = hasUnread(community.id, community.last_activity_at);

            return (
              <Link
                key={community.id}
                to={`/workspace-groups/${community.slug}`}
                className="group flex shrink-0 items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-left transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
              >
                <div className="relative shrink-0">
                  <CommunityAvatar
                    kind={community.kind}
                    name={community.name}
                    coverImage={community.cover_image}
                    className="aspect-square h-9 w-9 shrink-0 rounded-md"
                    iconClassName="h-4 w-4"
                  />
                  {unread && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background">
                      <span className="sr-only">New activity</span>
                    </span>
                  )}
                </div>

                <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                  <p className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
                    {pinned && <Pin className="h-3 w-3 shrink-0 fill-current text-muted-foreground" aria-label="Pinned" />}
                    <span className="truncate">{community.name}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatRelativeTime(community.last_activity_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </HorizontalScroller>
      </section>

      <section aria-labelledby="your-communities" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="your-communities" className="flex items-baseline gap-2 text-lg font-semibold tracking-tight text-foreground">
            Your communities
            <span className="tabular text-sm font-normal text-muted-foreground">{sortedCommunities.length}</span>
          </h2>

          <Button variant="ghost" size="sm" onClick={onExploreDiscovery}>
            Discover more
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card shadow-card">
          {sortedCommunities.map((community) => {
            const kind = getCommunityKindMeta(community.kind);
            const pinned = isPinned(community.id);
            const isPrivate = community.visibility === "private";

            return (
              <li
                key={community.id}
                className="group relative flex items-center gap-3 p-4 transition-colors duration-150 hover:bg-accent/50"
              >
                <CommunityAvatar
                  kind={community.kind}
                  name={community.name}
                  coverImage={community.cover_image}
                  className="aspect-square h-11 w-11 shrink-0 rounded-lg"
                  iconClassName="h-5 w-5"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3 className="truncate font-medium text-foreground">
                    {/* The link covers the row via ::after so the whole row is
                        the hit target; the pin button sits above it (z-10). */}
                    <Link
                      to={`/workspace-groups/${community.slug}`}
                      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
                    >
                      {community.name}
                    </Link>
                  </h3>

                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {community.description || "No description yet."}
                  </p>

                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span>{kind.label}</span>
                    <span aria-hidden>·</span>
                    <span>{community.viewer_is_owner ? "Owner" : "Member"}</span>
                    <span aria-hidden>·</span>
                    {isPrivate ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Invite only
                      </span>
                    ) : (
                      <span>Open</span>
                    )}
                    <span aria-hidden>·</span>
                    <span className="tabular">
                      {community.member_count} {community.member_count === 1 ? "member" : "members"}
                    </span>
                    <span aria-hidden className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">Active {formatRelativeTime(community.last_activity_at)}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePin(community.id);
                  }}
                  aria-pressed={pinned}
                  aria-label={pinned ? `Unpin ${community.name}` : `Pin ${community.name} to the top`}
                  title={pinned ? "Unpin" : "Pin to top"}
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                    pinned
                      ? "text-foreground hover:bg-accent"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Pin className={cn("h-4 w-4", pinned && "fill-current")} />
                </button>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col items-start justify-between gap-4 border-t pt-6 md:flex-row md:items-center">
        <div>
          <h3 className="text-sm font-medium text-foreground">Looking for more groups?</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Clubs, project teams, research circles and study groups across SRM AP.
          </p>
        </div>

        <Button onClick={onExploreDiscovery} variant="outline" className="w-full shrink-0 md:w-auto">
          <Compass className="h-4 w-4" />
          Browse communities
        </Button>
      </div>
    </div>
  );
}

export default MyCommunitiesHub;
