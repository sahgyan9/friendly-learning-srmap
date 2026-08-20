import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  Lock,
  Pin,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="space-y-6">
        <Card className="border-dashed border-2 border-border/80 bg-card/60">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </span>
            <div className="space-y-1 max-w-md">
              <h3 className="text-xl font-bold tracking-tight">You haven't joined a community yet</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect with hackathon teammates, join your department clubs, or start a study group for upcoming exams.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button onClick={onExploreDiscovery} size="lg" className="gap-2">
                <Compass className="h-4 w-4" />
                Find my communities
              </Button>
              <Button onClick={onStartGroup} size="lg" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Start a group
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Quick-Jump Active Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quick Jump ({sortedCommunities.length})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">Tap to jump straight in</span>
        </div>

        <HorizontalScroller className="flex items-center gap-2.5 py-1 px-0.5" ariaLabel="Quick jump communities">
          {sortedCommunities.map((community) => {
            const pinned = isPinned(community.id);
            const unread = hasUnread(community.id, community.last_activity_at);

            return (
              <Link
                key={community.id}
                to={`/workspace-groups/${community.slug}`}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs shrink-0",
                  pinned && "border-amber-500/40 bg-amber-500/5",
                )}
              >
                <div className="relative shrink-0">
                  <CommunityAvatar
                    kind={community.kind}
                    name={community.name}
                    coverImage={community.cover_image}
                    className="h-9 w-9 shrink-0 rounded-lg aspect-square"
                    iconClassName="h-4.5 w-4.5"
                  />
                  {unread && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                  )}
                  {pinned && (
                    <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white">
                      ★
                    </span>
                  )}
                </div>

                <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                  <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {community.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatRelativeTime(community.last_activity_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </HorizontalScroller>
      </div>

      {/* 2. My Workspaces Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Your Workspaces & Teams</h2>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
              {sortedCommunities.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExploreDiscovery}
              className="text-xs font-semibold gap-1.5 h-8 text-primary hover:text-primary"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Discover more</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {sortedCommunities.map((community) => {
            const kind = getCommunityKindMeta(community.kind);
            const pinned = isPinned(community.id);
            const isPrivate = community.visibility === "private";

            return (
              <div
                key={community.id}
                className={cn(
                  "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-accent/20 hover:shadow-xs",
                  pinned && "border-amber-500/30 bg-amber-500/3",
                )}
              >
                {/* Left Area: Avatar + Details */}
                <Link
                  to={`/workspace-groups/${community.slug}`}
                  className="flex flex-1 items-start gap-3.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                >
                  <div className="relative shrink-0">
                    <CommunityAvatar
                      kind={community.kind}
                      name={community.name}
                      coverImage={community.cover_image}
                      className="h-11 w-11 shrink-0 rounded-xl aspect-square"
                      iconClassName="h-5 w-5"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Header row: Name + Category & Role inline */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-foreground transition-colors duration-200 group-hover:text-primary truncate">
                        {community.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <span>{kind.label}</span>
                        <span aria-hidden className="text-border">·</span>
                        <span>{community.viewer_is_owner ? "Owner" : "Member"}</span>
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

                    <p className="line-clamp-1 text-xs text-muted-foreground leading-relaxed">
                      {community.description || "Campus workspace for collaboration and discussions."}
                    </p>

                    {/* Secondary stats row */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5 font-medium">
                      <span>{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
                      <span aria-hidden className="text-border">·</span>
                      <span>Active {formatRelativeTime(community.last_activity_at)}</span>
                    </div>
                  </div>
                </Link>

                {/* Right Action Area */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePin(community.id);
                    }}
                    title={pinned ? "Unpin community" : "Pin to top of your hub"}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                      pinned
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                        : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {pinned ? <Pin className="h-3.5 w-3.5 fill-current" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>

                  <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold rounded-lg gap-1.5">
                    <Link to={`/workspace-groups/${community.slug}`}>
                      <span>Enter</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Discovery Suggestion Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/5 via-card to-background p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-foreground">Looking for more campus groups?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Explore 20+ active clubs, project teams, research circles, and study groups across SRM AP.
            </p>
          </div>
        </div>

        <Button onClick={onExploreDiscovery} size="sm" className="h-9 w-full md:w-auto shrink-0 gap-2 font-semibold">
          <Compass className="h-4 w-4" />
          <span>Discover Communities</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default MyCommunitiesHub;
