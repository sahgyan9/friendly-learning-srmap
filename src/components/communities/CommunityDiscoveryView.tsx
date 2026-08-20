import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ChevronDown,
  Compass,
  Drama,
  Flame,
  LayoutGrid,
  List,
  MessagesSquare,
  Microscope,
  Plus,
  Search,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { CommunityRow } from "@/components/communities/CommunityRow";
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
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, topics, project tags (e.g. SIH, robotics, web dev)..."
              className="pl-11 pr-10 h-11 bg-card/80 text-sm shadow-2xs"
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
          <div className="flex items-center rounded-lg border border-border bg-card p-1 shrink-0 h-11">
            <button
              type="button"
              onClick={() => onViewModeChange("rows")}
              title="List / Rows view"
              className={cn(
                "flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs transition-colors h-8",
                viewMode === "rows"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4 mr-1 sm:mr-1.5" />
              <span className="hidden sm:inline">Rows</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Grid view"
              className={cn(
                "flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs transition-colors h-8",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
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
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 shadow-2xs",
              kind === "all"
                ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            All categories
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
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 shadow-2xs",
                  active
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <option.icon className="h-3.5 w-3.5" aria-hidden />
                {option.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "tabular-nums text-[11px] px-1 rounded-full",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground bg-muted",
                    )}
                  >
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
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground whitespace-nowrap shrink-0"
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
            <Skeleton key={index} className={viewMode === "grid" ? "h-52 w-full rounded-2xl" : "h-24 w-full rounded-2xl"} />
          ))}
        </div>
      ) : communities.length > 0 ? (
        isBrowsingAllSections ? (
          /* Curated Campus Exploration Sections in Grid Mode */
          <div className="space-y-10">
            {/* 1. Active Today */}
            {activeToday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Flame className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-foreground">Active Today on Campus</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Recent discussions</span>
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
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Zap className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-foreground">Hackathon Teams & Project Labs</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onKindChange("hackathon")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View all hackathons →
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
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-foreground">Study Groups & Research Labs</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onKindChange("study")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View all study rooms →
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
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Drama className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-bold text-foreground">Clubs & Student Societies</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onKindChange("club")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View all clubs →
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
        <Card className="border-border/80 bg-card/60">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="h-7 w-7" />
            </span>

            {search.trim().length > 0 || kind !== "all" ? (
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold">No communities match your search</h3>
                <p className="text-sm text-muted-foreground">
                  Try searching with different keywords, select "All categories", or start a new group.
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
                      Start this group
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
                <h3 className="text-lg font-bold">No groups found</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to start a group for your batch, department, or hackathon team.
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
