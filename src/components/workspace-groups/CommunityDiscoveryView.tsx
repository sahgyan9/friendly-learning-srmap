import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Compass,
  LayoutGrid,
  List,
  MessagesSquare,
  Microscope,
  Plus,
  Search,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityCard } from "@/components/workspace-groups/CommunityCard";
import { CommunityRow } from "@/components/workspace-groups/CommunityRow";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
import {
  COMMUNITY_KINDS,
  type Community,
} from "@/integrations/supabase/services/communities";
import { cn } from "@/lib/utils";

interface CommunityDiscoveryViewProps {
  communities: Community[];
  loading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  kind: string;
  onKindChange: (kind: string) => void;
  kindCounts: Record<string, number>;
  viewMode: "rows" | "grid";
  onViewModeChange: (mode: "rows" | "grid") => void;
  onMembershipChange: (id: string, patch: Partial<Community>) => void;
  onStartGroup: () => void;
  isUserSignedIn: boolean;
}

export function CommunityDiscoveryView({
  communities,
  loading,
  search,
  onSearchChange,
  kind,
  onKindChange,
  kindCounts,
  viewMode,
  onViewModeChange,
  onMembershipChange,
  onStartGroup,
  isUserSignedIn,
}: CommunityDiscoveryViewProps) {
  const [showAllKinds, setShowAllKinds] = React.useState(false);

  const { visibleKinds, hiddenCount, hasMoreKinds } = useMemo(() => {
    const known = Object.keys(kindCounts).length > 0;
    const defaultVisible = COMMUNITY_KINDS.filter(
      (option) => option.value === kind || (kindCounts[option.value] ?? 0) > 0,
    );
    const defaultHidden = COMMUNITY_KINDS.filter((option) => !defaultVisible.includes(option));
    const hasMore = known && defaultHidden.length > 0;

    if (!known || showAllKinds) {
      return {
        visibleKinds: [...COMMUNITY_KINDS],
        hiddenCount: defaultHidden.length,
        hasMoreKinds: hasMore,
      };
    }

    return {
      visibleKinds: defaultVisible,
      hiddenCount: defaultHidden.length,
      hasMoreKinds: hasMore,
    };
  }, [kindCounts, showAllKinds, kind]);

  // Curated section view only in Grid mode when browsing all without a search query
  const isBrowsingAllSections = kind === "all" && search.trim().length === 0 && viewMode === "grid";

  const activeToday = useMemo(() => {
    return [...communities]
      .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
      .slice(0, 3);
  }, [communities]);

  const hackathonTeams = useMemo(() => {
    return communities.filter((c) => c.kind === "hackathon" || c.kind === "project").slice(0, 3);
  }, [communities]);

  const studyCircles = useMemo(() => {
    return communities.filter((c) => c.kind === "study" || c.kind === "research").slice(0, 3);
  }, [communities]);

  const clubs = useMemo(() => {
    return communities.filter((c) => c.kind === "club" || c.kind === "general").slice(0, 3);
  }, [communities]);

  return (
    <div className="space-y-6">
      {/* Search & Category Filter Strip */}
      <div className="space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name or topic (SIH, robotics, web dev)"
              className="h-10 pl-10 pr-10"
              aria-label="Search groups"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Rows vs Grid */}
          <div className="flex h-10 shrink-0 items-center rounded-md border bg-card p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("rows")}
              title="List view"
              aria-pressed={viewMode === "rows"}
              className={cn(
                "flex h-8 items-center justify-center rounded px-2.5 text-xs transition-colors duration-150",
                viewMode === "rows"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Grid view"
              aria-pressed={viewMode === "grid"}
              className={cn(
                "flex h-8 items-center justify-center rounded px-2.5 text-xs transition-colors duration-150",
                viewMode === "grid"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <HorizontalScroller className="flex items-center gap-2 py-1 px-0.5" ariaLabel="Community categories">
          <button
            type="button"
            onClick={() => onKindChange("all")}
            aria-pressed={kind === "all"}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm transition-colors duration-150",
              kind === "all"
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Compass className="h-4 w-4" />
            All
          </button>

          {visibleKinds.map((option) => {
            const count = kindCounts[option.value];
            const active = kind === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onKindChange(option.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm transition-colors duration-150",
                  active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <option.icon className="h-4 w-4" aria-hidden />
                {option.label}
                {count > 0 && (
                  <span className="tabular text-xs text-muted-foreground">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {hasMoreKinds && (
            <button
              type="button"
              onClick={() => setShowAllKinds((value) => !value)}
              aria-expanded={showAllKinds}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-dashed bg-card px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              {showAllKinds ? "Fewer" : `More (${hiddenCount})`}
              <ChevronDown
                aria-hidden
                className={cn("h-3.5 w-3.5 transition-transform duration-200", showAllKinds && "rotate-180")}
              />
            </button>
          )}
        </HorizontalScroller>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={viewMode === "grid" ? "h-52 w-full rounded-lg" : "h-24 w-full rounded-lg"} />
          ))}
        </div>
      ) : communities.length > 0 ? (
        isBrowsingAllSections ? (
          /* Curated Campus Exploration Sections in Grid Mode */
          <div className="space-y-10">
            {/* 1. Active Today */}
            {activeToday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Active today</h3>
                  <span className="text-sm text-muted-foreground">Recent discussions</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeToday.map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onMembershipChange={onMembershipChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Hackathons & Projects */}
            {hackathonTeams.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Hackathon teams and project labs</h3>
                  <button
                    type="button"
                    onClick={() => onKindChange("hackathon")}
                    className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {hackathonTeams.map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onMembershipChange={onMembershipChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Study Circles */}
            {studyCircles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Study groups and research labs</h3>
                  <button
                    type="button"
                    onClick={() => onKindChange("study")}
                    className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {studyCircles.map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onMembershipChange={onMembershipChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Clubs & Societies */}
            {clubs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Clubs and societies</h3>
                  <button
                    type="button"
                    onClick={() => onKindChange("club")}
                    className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View all
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {clubs.map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onMembershipChange={onMembershipChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : viewMode === "rows" ? (
          /* Rows View Mode */
          <div className="space-y-3 mb-8">
            {communities.map((community) => (
              <CommunityRow
                key={community.id}
                community={community}
                onMembershipChange={onMembershipChange}
              />
            ))}
          </div>
        ) : (
          /* Grid View Mode */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {communities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                onMembershipChange={onMembershipChange}
              />
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Users className="h-5 w-5" />
            </span>

            {search.trim().length > 0 || kind !== "all" ? (
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-semibold">No communities match</h3>
                <p className="text-sm text-muted-foreground">
                  Try other keywords, clear the category filter, or start the group yourself.
                </p>
                <div className="flex items-center justify-center gap-3 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onSearchChange("");
                      onKindChange("all");
                    }}
                  >
                    Reset filters
                  </Button>
                  {isUserSignedIn ? (
                    <Button onClick={onStartGroup} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      Start a group
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to="/signin">Sign in to start a group</Link>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-semibold">No groups yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start a group for your batch, department or hackathon team.
                </p>
                {isUserSignedIn ? (
                  <Button onClick={onStartGroup} className="mt-2 gap-1.5">
                    <Plus className="h-4 w-4" />
                    Start a group
                  </Button>
                ) : (
                  <Button asChild className="mt-2">
                    <Link to="/signin">Sign in to start a group</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CommunityDiscoveryView;
