import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Compass, LayoutGrid, List, Plus, Sparkles, Users, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateCommunityModal } from "@/components/communities/CreateCommunityModal";
import MyInvites from "@/components/communities/MyInvites";
import { MyCommunitiesHub } from "@/components/communities/MyCommunitiesHub";
import { CommunityDiscoveryView } from "@/components/communities/CommunityDiscoveryView";
import { CommunityOnboardingHero } from "@/components/communities/CommunityOnboardingHero";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useHasVisitedGroupsNav } from "@/hooks/useFeatureAnnouncement";
import { cn } from "@/lib/utils";
import {
  getCommunityKindCounts,
  listCommunities,
  type Community,
} from "@/integrations/supabase/services/communities";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import { ROUTE_META } from "@/lib/seo/route-meta";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";

export type WorkspaceViewMode = "my-communities" | "discover";

const Communities = () => {
  const { user } = useAuth();
  const { markSeen: markGroupsNavSeen } = useHasVisitedGroupsNav();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State
  const viewParam = searchParams.get("view") as WorkspaceViewMode | null;
  const [activeView, setActiveView] = useState<WorkspaceViewMode>(
    viewParam === "discover" ? "discover" : "my-communities",
  );

  // Data State
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [kindCounts, setKindCounts] = useState<Record<string, number>>({});
  const [viewLayout, setViewLayout] = useState<"rows" | "grid">("grid");

  // Reaching this page clears the welcome tour navbar dot
  useEffect(() => {
    markGroupsNavSeen();
  }, [markGroupsNavSeen]);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch all communities (the RPC handles search and kind filtering)
    const { data } = await listCommunities({
      search: debouncedSearch,
      kind,
      limit: 60,
    });
    setAllCommunities(data ?? []);
    setLoading(false);
  }, [debouncedSearch, kind]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getCommunityKindCounts().then(setKindCounts);
  }, []);

  // Filter joined communities for the current viewer
  const myCommunities = useMemo(() => {
    if (!user) return [];
    return allCommunities.filter(
      (c) => c.viewer_is_member || c.viewer_is_owner,
    );
  }, [allCommunities, user]);

  // Synchronize default view based on user membership
  const [hasInitializedDefaultView, setHasInitializedDefaultView] = useState(false);
  useEffect(() => {
    if (loading || hasInitializedDefaultView) return;

    if (!user) {
      setActiveView("discover");
    } else if (viewParam) {
      setActiveView(viewParam);
    } else if (myCommunities.length === 0) {
      // First-time user with 0 communities lands on discovery with the onboarding guide
      setActiveView("discover");
    } else {
      setActiveView("my-communities");
    }

    setHasInitializedDefaultView(true);
  }, [loading, user, myCommunities.length, viewParam, hasInitializedDefaultView]);

  const handleSwitchView = (nextView: WorkspaceViewMode) => {
    setActiveView(nextView);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextView === "discover") {
          next.set("view", "discover");
        } else {
          next.delete("view");
        }
        return next;
      },
      { replace: true },
    );
  };

  const applyMembership = useCallback((id: string, patch: Partial<Community>) => {
    setAllCommunities((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  const isFirstTimeUser = user && myCommunities.length === 0 && !loading;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={ROUTE_META["/workspace-groups"].title}
        description={ROUTE_META["/workspace-groups"].description}
        keywords="srmap workspace groups, srm ap student groups, study groups srm ap, hackathon teams srmap, project collaboration srm university ap, campus student groups"
        canonical={`${PRIMARY_DOMAIN}/workspace-groups`}
      />

      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Workspace Groups", url: `${PRIMARY_DOMAIN}/workspace-groups` },
        ])}
      />

      {/* Hero Header with Brand Aesthetics */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-amber-500/8 via-background to-background">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-500/6 blur-2xl" />

        <div className="container mx-auto max-w-6xl px-4 pb-6 pt-24 md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Pill label */}
            <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Users className="h-3.5 w-3.5" />
              05 — Campus Communities & Workspaces
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {activeView === "my-communities" && user
                    ? "My Communities & Hub"
                    : "Discover Campus Communities"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
                  Step inside dedicated student rooms—hackathon teams, project labs, clubs, and study circles.
                  Chat in real time, share project resources, and collaborate with peers across SRM AP.
                </p>
              </div>

              {user ? (
                <Button onClick={() => setCreateOpen(true)} size="lg" className="shrink-0 gap-1.5 shadow-sm">
                  <Plus className="h-4 w-4" />
                  Start a group
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" className="shrink-0">
                  <Link to="/signin">Sign in to start a group</Link>
                </Button>
              )}
            </div>

            {/* Segmented Mode Navigation Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <div className="inline-flex rounded-xl border border-border/80 bg-muted/40 p-1 backdrop-blur-xs">
                {user && (
                  <button
                    type="button"
                    onClick={() => handleSwitchView("my-communities")}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200",
                      activeView === "my-communities"
                        ? "bg-card text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>My Communities</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-5 px-1.5 py-0 text-[10px] font-bold rounded-full",
                        activeView === "my-communities"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {myCommunities.length}
                    </Badge>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSwitchView("discover")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200",
                    activeView === "discover"
                      ? "bg-card text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Compass className="h-3.5 w-3.5 text-amber-500" />
                  <span>Discover & Explore</span>
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 py-0 text-[10px] text-muted-foreground rounded-full"
                  >
                    {allCommunities.length}
                  </Badge>
                </button>
              </div>

              {/* Status summary pill */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Campus Spaces</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Body Canvas */}
      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-36 md:pb-48">
        <MyInvites />

        {/* First-Time User Onboarding Guide (shown on top when user has 0 joined groups) */}
        {isFirstTimeUser && (
          <CommunityOnboardingHero
            communities={allCommunities}
            onMembershipChange={applyMembership}
            onExploreAll={() => handleSwitchView("discover")}
            onStartGroup={() => setCreateOpen(true)}
          />
        )}

        {/* View Routing */}
        <AnimatePresence mode="wait">
          {activeView === "my-communities" && user ? (
            <motion.div
              key="my-communities"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MyCommunitiesHub
                myCommunities={myCommunities}
                onMembershipChange={applyMembership}
                onExploreDiscovery={() => handleSwitchView("discover")}
                onStartGroup={() => setCreateOpen(true)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CommunityDiscoveryView
                communities={allCommunities}
                loading={loading}
                search={search}
                onSearchChange={setSearch}
                kind={kind}
                onKindChange={setKind}
                kindCounts={kindCounts}
                viewMode={viewLayout}
                onViewModeChange={setViewLayout}
                onMembershipChange={applyMembership}
                onStartGroup={() => setCreateOpen(true)}
                isUserSignedIn={Boolean(user)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Community Modal */}
      {user && <CreateCommunityModal open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  );
};

export default Communities;
