import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LayoutGrid, List, Plus, Search, Users } from "lucide-react";
import { motion } from "framer-motion";

import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { CommunityRow } from "@/components/communities/CommunityRow";
import { CreateCommunityModal } from "@/components/communities/CreateCommunityModal";
import MyInvites from "@/components/communities/MyInvites";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useHasVisitedGroupsNav } from "@/hooks/useFeatureAnnouncement";
import { cn } from "@/lib/utils";
import {
  COMMUNITY_KINDS,
  getCommunityKindCounts,
  listCommunities,
  type Community,
} from "@/integrations/supabase/services/communities";

const Communities = () => {
  const { user } = useAuth();
  const { markSeen: markGroupsNavSeen } = useHasVisitedGroupsNav();
  const cardsRef = useRef<HTMLDivElement>(null);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("all");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [kindCounts, setKindCounts] = useState<Record<string, number>>({});
  const [showAllKinds, setShowAllKinds] = useState(false);
  const [viewMode, setViewMode] = useState<"rows" | "grid">("rows");

  // Reaching this page is what clears the welcome tour's navbar dot.
  useEffect(() => {
    markGroupsNavSeen();
  }, [markGroupsNavSeen]);

  // Scroll to cards before paint so hero is not visible on load, and re-run when loading finishes.
  useLayoutEffect(() => {
    const scrollToCards = () => {
      if (cardsRef.current) {
        const navbarHeight = 64;
        const top = cardsRef.current.getBoundingClientRect().top + window.scrollY - navbarHeight;
        window.scrollTo({ top, behavior: "instant" });
      }
    };

    scrollToCards();
    const timer = setTimeout(scrollToCards, 60);
    return () => clearTimeout(timer);
  }, [loading]);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await listCommunities({ search: debouncedSearch, kind, mine });
    setCommunities(data);
    setLoading(false);
  }, [debouncedSearch, kind, mine]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getCommunityKindCounts().then(setKindCounts);
  }, []);

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

  const applyMembership = useCallback((id: string, patch: Partial<Community>) => {
    setCommunities((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  const filtering = debouncedSearch.trim().length > 0 || kind !== "all" || mine;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Groups & Workspaces | Friendly Learning"
        description="Hackathon teams, project groups, research labs and study circles run by students at SRM AP."
      />

      {/* Hero header — same design language as FeaturesShowcase cards */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-amber-500/5 via-background to-background">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-amber-500/5 blur-2xl" />

        <div className="container mx-auto max-w-6xl px-4 pb-8 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Pill label — matches FeaturesShowcase numbering */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              <Users className="h-3.5 w-3.5" />
              05 — Groups & Workspaces
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Workspaces & Groups</h1>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  Step inside dedicated student communities—hackathon teams, project labs, clubs, and study rooms.
                  Join a room to chat, post, and collaborate in real-time.
                </p>
              </div>

              {user ? (
                <Button onClick={() => setCreateOpen(true)} size="lg" className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Start a group
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" className="shrink-0">
                  <Link to="/signin">Sign in to start a group</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div ref={cardsRef} className="container mx-auto max-w-6xl px-4 pt-6 pb-36 md:pb-48">
        <MyInvites />

        <div className="mb-6 space-y-3">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groups and workspaces..."
                className="pl-9"
                aria-label="Search groups"
              />
            </div>

            {/* View Mode Toggle: Rows vs Grid */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("rows")}
                title="Destination list view"
                className={cn(
                  "flex items-center justify-center rounded-md p-1.5 text-xs transition-colors",
                  viewMode === "rows"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={cn(
                  "flex items-center justify-center rounded-md p-1.5 text-xs transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setKind("all")}
              aria-pressed={kind === "all"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                kind === "all"
                  ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              All groups
            </button>

            {visibleKinds.map((option) => {
              const count = kindCounts[option.value];

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  aria-pressed={kind === option.value}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                    kind === option.value
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <option.icon className="h-3.5 w-3.5" aria-hidden />
                  {option.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "tabular-nums text-[11px]",
                        kind === option.value ? "text-primary-foreground/80" : "text-muted-foreground",
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

            {user && (
              <button
                type="button"
                onClick={() => setMine((value) => !value)}
                aria-pressed={mine}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 ml-auto",
                  mine
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                Only mine
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className={viewMode === "grid" ? "h-52 w-full rounded-xl" : "h-24 w-full rounded-xl"} />
            ))}
          </div>
        ) : communities.length > 0 ? (
          viewMode === "rows" ? (
            <div className="space-y-3 mb-8">
              {communities.map((community) => (
                <CommunityRow
                  key={community.id}
                  community={community}
                  onMembershipChange={applyMembership}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              {communities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onMembershipChange={applyMembership}
                />
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </span>

              {filtering ? (
                <>
                  <p className="font-medium">No groups match that</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Try a different kind, or clear the search.
                  </p>
                </>
              ) : user ? (
                <>
                  <p className="font-medium">No groups yet — start the first one</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    A hackathon team, a club, a study circle. You'll own it, and other students can
                    join from the link.
                  </p>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start a group
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium">No groups yet</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Sign in and you can start the first one — a hackathon team, a club, or a study
                    circle.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/signin">Sign in</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {user && <CreateCommunityModal open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  );
};

export default Communities;
