import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { BookOpen, EyeOff, Search, SlidersHorizontal, ArrowUpDown, Star, X } from "lucide-react";
import { motion } from "framer-motion";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FacultyCard } from "@/components/faculty/FacultyCard";
import { FacultyRatingModal } from "@/components/faculty/FacultyRatingModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useHasSeenFacultyRatings } from "@/hooks/useFeatureAnnouncement";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  getFacultyDepartments,
  getFacultyDirectoryStats,
  getFacultyInterestFacets,
  getFacultyList,
  type Faculty as FacultyMember,
  type FacultySort,
} from "@/integrations/supabase/services/faculty";

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: FacultySort; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "reviews", label: "Review count" },
];

/**
 * Module-level cache that survives component unmount/remount.
 *
 * When the user navigates to a professor's page and hits Back, the Faculty
 * component remounts from scratch. Without a cache, it would show 12 skeletons
 * while re-fetching, then replace them with real cards — causing a DOM reflow
 * that makes scroll position restoration impossible (the page height changes
 * after the scroll was already attempted).
 *
 * Keyed by the filter combination so that changing search/dept/sort never
 * serves stale results. Max age of 2 minutes — fresh enough for a session
 * but stale enough not to serve 10-minute-old data.
 */
interface CacheEntry {
  faculty: FacultyMember[];
  total: number;
  departments: string[];
  facets: { interest: string; count: number }[];
  stats: { faculty_count: number; rating_count: number; department_count: number };
  fetchedAt: number;
}
const PAGE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 1000;

function makeCacheKey(search: string, department: string, interest: string, sort: string, limit: number) {
  return `${search}|${department}|${interest}|${sort}|${limit}`;
}

const Faculty = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const { markSeen } = useHasSeenFacultyRatings();

  const department = searchParams.get("dept") || searchParams.get("department") || "all";
  const interest = searchParams.get("interest") ?? "";
  const sort = (searchParams.get("sort") as FacultySort) ?? "name";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 300);

  // On back navigation, restore the limit that was loaded before leaving
  const savedLimit = typeof sessionStorage !== "undefined" ? Number(sessionStorage.getItem(`faculty_limit:${location.key}`)) : 0;
  const initialLimit = savedLimit && savedLimit > PAGE_SIZE ? savedLimit : PAGE_SIZE;

  const cacheKey = makeCacheKey(debouncedSearch, department, interest, sort, initialLimit);
  const cached = PAGE_CACHE.get(cacheKey);
  const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  const [faculty, setFaculty] = useState<FacultyMember[]>(isFresh ? cached.faculty : []);
  const [departments, setDepartments] = useState<string[]>(isFresh ? cached.departments : []);
  const [facets, setFacets] = useState<{ interest: string; count: number }[]>(isFresh ? cached.facets : []);
  const [stats, setStats] = useState(isFresh ? cached.stats : { faculty_count: 0, rating_count: 0, department_count: 0 });
  const [total, setTotal] = useState(isFresh ? cached.total : 0);
  // Skip the loading skeleton entirely if we have cached data
  const [loading, setLoading] = useState(!isFresh);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<FacultyMember | null>(null);

  // Track whether this is the first mount with back navigation
  const isBackNav = navigationType === "POP";
  const didRestoreScroll = useRef(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Scroll to cards before paint so hero is not visible on load, and re-run when loading finishes.
  useIsomorphicLayoutEffect(() => {
    if (!isBackNav) {
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
    }
  }, [isBackNav, loading]);

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const loadFaculty = useCallback(
    async (offset = 0, forceRefresh = false) => {
      if (offset === 0) {
        // For back navigation with fresh cache, skip re-fetching entirely
        const ck = makeCacheKey(debouncedSearch, department, interest, sort, initialLimit);
        const hit = PAGE_CACHE.get(ck);
        if (!forceRefresh && hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
          setFaculty(hit.faculty);
          setTotal(hit.total);
          setDepartments(hit.departments);
          setFacets(hit.facets);
          setStats(hit.stats);
          setLoading(false);
          return;
        }
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const fetchLimit = offset === 0 ? initialLimit : PAGE_SIZE;

      const [{ data, total: matched }, { data: deptData }, { data: facetData }, { data: statsData }] =
        offset === 0
          ? await Promise.all([
              getFacultyList({ search: debouncedSearch, department, interest, sort, limit: fetchLimit, offset }),
              getFacultyDepartments(),
              getFacultyInterestFacets(24),
              getFacultyDirectoryStats(),
            ])
          : [
              await getFacultyList({ search: debouncedSearch, department, interest, sort, limit: PAGE_SIZE, offset }),
              { data: departments },
              { data: facets },
              { data: stats },
            ];

      const nextList = offset === 0 ? data : [...faculty, ...data];

      // Store in module cache so back navigation gets instant results
      PAGE_CACHE.set(
        makeCacheKey(debouncedSearch, department, interest, sort, nextList.length),
        {
          faculty: nextList,
          total: matched,
          departments: deptData,
          facets: facetData,
          stats: statsData,
          fetchedAt: Date.now(),
        }
      );

      // Persist the loaded count so back navigation fetches the right limit
      sessionStorage.setItem(`faculty_limit:${location.key}`, String(nextList.length));

      setFaculty(nextList);
      setTotal(matched);
      if (offset === 0) {
        setDepartments(deptData);
        setFacets(facetData);
        setStats(statsData);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, department, interest, sort, location.key],
  );

  useEffect(() => {
    loadFaculty(0);
    didRestoreScroll.current = false;
  }, [loadFaculty]);

  // On back navigation: once cards are rendered (loading=false), restore scroll
  // position. Using a ref guard so this only fires once per mount.
  useEffect(() => {
    if (!loading && isBackNav && !didRestoreScroll.current) {
      didRestoreScroll.current = true;
      const saved = sessionStorage.getItem(`scrollpos:${location.key}`);
      if (!saved) return;
      const target = Number(saved);
      if (!target || target <= 0) return;

      // Cards are already in the DOM (cache hit = no skeleton phase), so we
      // can scroll immediately. We still do two follow-up frames to catch
      // lazy-loaded images that might shift layout.
      const snap = () => window.scrollTo({ top: target, behavior: "instant" as ScrollBehavior });
      snap();
      requestAnimationFrame(snap);
      setTimeout(snap, 80);
      setTimeout(snap, 200);
    }
  }, [loading, isBackNav, location.key]);

  const updateParam = (key: string, value: string, clearWhen: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === clearWhen) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    updateParam("q", debouncedSearch, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const canonical = `${PRIMARY_DOMAIN}/faculty`;

  return (
    <>
      <SEOHead
        title="Rate SRM AP Faculty | Anonymous Professor Reviews by Students"
        description="Browse every SRM University-AP faculty member and read honest, anonymous student ratings on teaching quality, grading fairness and helpfulness before you pick your courses."
        keywords="srm ap faculty rating, rate my professor srmap, srm university ap professor reviews, srmap faculty feedback"
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Faculty Ratings", url: canonical },
        ])}
      />

      <div className="min-h-screen bg-background">

        {/* Hero header — same design language as FeaturesShowcase cards */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-rose-500/5 via-background to-background">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-rose-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-rose-500/5 blur-2xl" />

          <div className="container mx-auto px-4 pb-5 pt-20 sm:pt-22">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Pill label — matches FeaturesShowcase numbering */}
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                <BookOpen className="h-3.5 w-3.5" />
                Faculty
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Faculty Ratings</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Honest, anonymous ratings from SRM AP students on teaching quality, grading fairness
                    and helpfulness. Know what a course is like before you register.
                  </p>
                </div>

                {/* Anonymous badge */}
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  <EyeOff className="h-3.5 w-3.5" />
                  Ratings are anonymous
                </span>
              </div>

              {/* Stats pills */}
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.faculty_count > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-0.5 text-xs sm:text-sm">
                    <BookOpen className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    <strong className="text-rose-600 dark:text-rose-400">{stats.faculty_count}</strong>
                    <span className="text-muted-foreground">faculty</span>
                  </div>
                )}
                {stats.department_count > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-0.5 text-xs sm:text-sm shadow-sm">
                    <strong className="text-foreground">{stats.department_count}</strong>
                    <span className="text-muted-foreground">departments</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-0.5 text-xs sm:text-sm shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <strong className="text-foreground">{stats.rating_count}</strong>
                  <span className="text-muted-foreground">{stats.rating_count === 1 ? "rating" : "ratings"}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div ref={cardsRef} className="container mx-auto px-4 py-4">
          <header className="sr-only">
            <h2>Browse and filter faculty</h2>
          </header>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, department or research interest..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10 pr-9"
                aria-label="Search faculty"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select value={department} onValueChange={(value) => updateParam("dept", value, "all")}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SlidersHorizontal className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateParam("sort", value, "rating")}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <ArrowUpDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Browse by research interest.
              Hidden once a filter is active — the active chip below replaces it,
              so the page never shows two competing sets of interest controls. */}
          {interest ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Showing faculty who work on</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-700 dark:text-rose-300">
                {interest}
                <button
                  type="button"
                  onClick={() => updateParam("interest", "", "")}
                  aria-label={`Clear ${interest} filter`}
                  className="rounded-full p-0.5 transition-colors hover:bg-rose-500/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          ) : (
            facets.length > 0 && (
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Browse by research interest
                  </p>
                  <span className="hidden text-[11px] text-muted-foreground/70 sm:inline-block">
                    Swipe to explore ({facets.length})
                  </span>
                </div>
                <HorizontalScroller className="flex items-center gap-1.5 py-1 px-0.5" ariaLabel="Research interest filters">
                  {facets.map((facet) => (
                    <button
                      key={facet.interest}
                      type="button"
                      onClick={() => updateParam("interest", facet.interest, "")}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs whitespace-nowrap transition-colors hover:border-rose-500/30 hover:bg-rose-500/5"
                    >
                      {facet.interest}
                      <span className="tabular-nums text-muted-foreground">{facet.count}</span>
                    </button>
                  ))}
                </HorizontalScroller>
              </div>
            )
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : faculty.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <h3 className="mb-1 text-lg font-semibold">No faculty found</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {search || department !== "all" || interest
                  ? "Try a different search, department or research interest."
                  : "The directory hasn't been synced yet. An admin can run the sync-faculty function to pull it from srmap.edu.in."}
              </p>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-3",
                  "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
                )}
              >
                {faculty.map((member) => (
                  <FacultyCard key={member.id} faculty={member} onRate={setRatingTarget} />
                ))}
              </div>

              {faculty.length < total && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => loadFaculty(faculty.length)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : `Load more (${total - faculty.length} left)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <Footer />
      </div>

      <FacultyRatingModal
        faculty={ratingTarget}
        open={ratingTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRatingTarget(null);
        }}
        onSubmitted={() => {
          loadFaculty(0, true); // force refresh after rating
          getFacultyDirectoryStats().then(({ data }) => setStats(data));
        }}
      />
    </>
  );
};

export default Faculty;
