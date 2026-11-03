import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { EyeOff, GraduationCap, Search, SlidersHorizontal, ArrowUpDown, UserRound, X } from "lucide-react";

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
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { getOfflineCache, setOfflineCache } from "@/lib/offline/offlineStorage";
import { useHasSeenFacultyRatings } from "@/hooks/useFeatureAnnouncement";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { matchFacultyDepartment } from "@/utils/user-utils";
import {
  getFacultyDepartments,
  getFacultyDirectoryStats,
  getFacultyInterestFacets,
  getFacultyList,
  type Faculty as FacultyMember,
  type FacultySort,
} from "@/integrations/supabase/services/faculty";

const PAGE_SIZE = 24;

const FACULTY_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

const SORT_OPTIONS: { value: FacultySort; label: string }[] = [
  { value: "name", label: "Name (A–Z)" },
  { value: "reviews", label: "Most Reviewed" },
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

/**
 * The same directory, kept on the device rather than in memory.
 *
 * PAGE_CACHE above dies with the tab, so closing the app and opening it again
 * meant rebuilding the whole directory from scratch — the one case where the
 * wait is most obvious. One entry, holding the first page of whichever
 * unsearched view was last looked at; a search is a question asked seconds
 * ago and is not worth answering later from a stale copy.
 */
const FACULTY_VIEW_CACHE_KEY = "faculty_view";

interface PersistedFacultyView extends Omit<CacheEntry, "fetchedAt"> {
  viewKey: string;
}

/** Identifies a directory view, ignoring how far the user has scrolled into it. */
const facultyViewKey = (search: string, department: string, interest: string, sort: string) =>
  `${search.trim()}|${department}|${interest}|${sort}`;

function makeCacheKey(search: string, department: string, interest: string, sort: string, limit: number) {
  return `${search}|${department}|${interest}|${sort}|${limit}`;
}

const Faculty = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const { markSeen } = useHasSeenFacultyRatings();
  const { profile } = useAuth();

  const [departments, setDepartments] = useState<string[]>(() => {
    // Check if cached departments exist
    for (const entry of PAGE_CACHE.values()) {
      if (entry.departments?.length > 0) return entry.departments;
    }
    return [];
  });

  const rawDeptParam = searchParams.get("dept") || searchParams.get("department");
  const matchedDeptParam = useMemo(() => {
    if (!rawDeptParam || rawDeptParam === "all") return null;
    return matchFacultyDepartment(rawDeptParam, departments) || rawDeptParam;
  }, [rawDeptParam, departments]);

  const userMatchedDept = useMemo(() => {
    return matchFacultyDepartment(profile?.department, departments);
  }, [profile?.department, departments]);

  const department = rawDeptParam !== null
    ? (rawDeptParam === "all" ? "all" : (matchedDeptParam || rawDeptParam))
    : (userMatchedDept || "all");

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
  const [facets, setFacets] = useState<{ interest: string; count: number }[]>(isFresh ? cached.facets : []);
  const [stats, setStats] = useState(isFresh ? cached.stats : { faculty_count: 0, rating_count: 0, department_count: 0 });
  const [total, setTotal] = useState(isFresh ? cached.total : 0);
  // Skip the loading skeleton entirely if we have cached data
  const [loading, setLoading] = useState(!isFresh);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<FacultyMember | null>(null);

  // What the list on screen is showing, so a fetch can tell "the same view,
  // already answered" from "a new one, needs a skeleton".
  const displayedViewRef = useRef<string | null>(null);
  const hasFacultyRef = useRef(false);
  hasFacultyRef.current = faculty.length > 0;

  // Paint the directory this device saw last, before going to the server.
  // Runs only when the in-memory cache missed — that one is newer whenever it
  // has anything. In an effect rather than the state initialisers above
  // because /faculty is pre-rendered and the first render has to match the
  // markup being hydrated; a layout effect still lands before paint.
  useIsomorphicLayoutEffect(() => {
    if (isFresh || debouncedSearch) return;

    const stored = getOfflineCache<PersistedFacultyView>(FACULTY_VIEW_CACHE_KEY);
    const view = stored?.data;
    if (!view?.faculty?.length) return;
    if (view.viewKey !== facultyViewKey(debouncedSearch, department, interest, sort)) return;

    setFaculty(view.faculty);
    setTotal(view.total);
    setDepartments(view.departments);
    setFacets(view.facets);
    setStats(view.stats);
    setLoading(false);
    displayedViewRef.current = view.viewKey;
    hasFacultyRef.current = true;
    // Mount only: from here on the fetch below owns the list.
  }, []);

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
          displayedViewRef.current = facultyViewKey(debouncedSearch, department, interest, sort);
          return;
        }
        // Only blank the list when the view actually changed. Re-asking for
        // the one already on screen — a re-mount, a revalidation of what was
        // restored from the device — keeps it there until the answer lands.
        const viewKey = facultyViewKey(debouncedSearch, department, interest, sort);
        setLoading(!(displayedViewRef.current === viewKey && hasFacultyRef.current));
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

        const viewKey = facultyViewKey(debouncedSearch, department, interest, sort);
        displayedViewRef.current = viewKey;

        if (!debouncedSearch) {
          setOfflineCache<PersistedFacultyView>(FACULTY_VIEW_CACHE_KEY, {
            viewKey,
            faculty: data,
            total: matched,
            departments: deptData,
            facets: facetData,
            stats: statsData,
          });
        }
      }
      setLoading(false);
      setLoadingMore(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, department, interest, sort, location.key],
  );

  // Revalidate faculty on pull-to-refresh gesture
  useEffect(() => {
    const handlePullRefresh = () => {
      loadFaculty(0, true);
    };
    window.addEventListener("fl:refresh", handlePullRefresh);
    return () => window.removeEventListener("fl:refresh", handlePullRefresh);
  }, [loadFaculty]);

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

        <header className="border-b border-border">
          <div className="container mx-auto px-4 pb-6 pt-20 sm:pt-24 animate-fade-up">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Faculty ratings</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Read what SRM AP students say about teaching, grading and helpfulness before you register, and rate faculty you have taken.
            </p>
            <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {stats.faculty_count > 0 && (
                <div className="flex items-baseline gap-1.5">
                  <dt className="sr-only">Faculty</dt>
                  <dd className="font-medium text-foreground tabular">{stats.faculty_count}</dd>
                  <span>faculty</span>
                </div>
              )}
              {stats.department_count > 0 && (
                <div className="flex items-baseline gap-1.5">
                  <dt className="sr-only">Departments</dt>
                  <dd className="font-medium text-foreground tabular">{stats.department_count}</dd>
                  <span>departments</span>
                </div>
              )}
              <div className="flex items-baseline gap-1.5">
                <dt className="sr-only">Ratings</dt>
                <dd className="font-medium text-foreground tabular">{stats.rating_count}</dd>
                <span>{stats.rating_count === 1 ? "rating" : "ratings"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <EyeOff className="h-4 w-4" aria-hidden />
                <span>Ratings are anonymous</span>
              </div>
            </dl>
          </div>
        </header>

        <div ref={cardsRef} className="container mx-auto px-4 py-6">
          <header className="sr-only">
            <h2>Browse and filter faculty</h2>
          </header>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
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
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select value={department} onValueChange={(value) => updateParam("dept", value, "")}>
              <SelectTrigger className="w-full sm:w-[260px]">
                <SlidersHorizontal className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                    {userMatchedDept && item === userMatchedDept ? " (your department)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(value) => updateParam("sort", value, "name")}>
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

          {/* One line that says which department is applied by default and
              offers the way out of it, right above the grid it affects. */}
          {userMatchedDept && department === userMatchedDept && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
              <p className="flex min-w-0 items-center gap-2 text-foreground">
                <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  Showing <span className="font-medium">{department}</span>, your department
                </span>
              </p>
              <Button variant="ghost" size="sm" onClick={() => updateParam("dept", "all", "")}>
                Show all departments
                {stats.faculty_count > 0 && <span className="text-muted-foreground tabular">({stats.faculty_count})</span>}
              </Button>
            </div>
          )}

          {userMatchedDept && department === "all" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Showing all departments</span>
              <Button variant="ghost" size="sm" onClick={() => updateParam("dept", userMatchedDept, "")}>
                <GraduationCap />
                Show {userMatchedDept} only
              </Button>
            </div>
          )}

          {/* Browse by research interest.
              Hidden once a filter is active — the active chip below replaces it,
              so the page never shows two competing sets of interest controls. */}
          {interest ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Showing faculty who work on</span>
              <span className="inline-flex h-8 items-center gap-1 rounded-md border border-primary bg-primary pl-3 pr-1 text-sm font-medium text-primary-foreground">
                {interest}
                <button
                  type="button"
                  onClick={() => updateParam("interest", "", "")}
                  aria-label={`Clear ${interest} filter`}
                  className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-primary-foreground/15"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          ) : (
            facets.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-sm font-medium text-foreground">Research interest</p>
                <HorizontalScroller className="flex items-center gap-1.5 py-1 px-0.5" ariaLabel="Research interest filters">
                  {facets.map((facet) => (
                    <button
                      key={facet.interest}
                      type="button"
                      onClick={() => updateParam("interest", facet.interest, "")}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-sm transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
                    >
                      {facet.interest}
                      <span className="text-xs text-muted-foreground tabular">{facet.count}</span>
                    </button>
                  ))}
                </HorizontalScroller>
              </div>
            )
          )}

          {loading ? (
            <div className={FACULTY_GRID} aria-busy="true" aria-label="Loading faculty">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col rounded-lg border border-border bg-card shadow-card">
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-2 pt-0.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3.5 w-1/2" />
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-20 rounded-md" />
                      <Skeleton className="h-5 w-16 rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-9 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : faculty.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <UserRound className="h-5 w-5 text-muted-foreground" />
              </span>
              <div>
                <h3 className="text-base font-semibold">No faculty found</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {search || department !== "all" || interest
                    ? "Nobody matches this search, department and research interest together."
                    : "The directory has not been synced yet. An admin can run the sync-faculty function to pull it from srmap.edu.in."}
                </p>
              </div>
              {(search || department !== "all" || interest) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    const next = new URLSearchParams(searchParams);
                    next.delete("q");
                    next.delete("interest");
                    next.set("dept", "all");
                    setSearchParams(next, { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
                Showing <span className="tabular">{faculty.length}</span> of <span className="tabular">{total}</span>
              </p>
              <div className={FACULTY_GRID}>
                {faculty.map((member, index) => (
                  <div
                    key={member.id}
                    className="min-w-0 animate-fade-up"
                    style={index < 6 ? { animationDelay: `${index * 35}ms` } : undefined}
                  >
                    <FacultyCard faculty={member} onRate={setRatingTarget} />
                  </div>
                ))}
              </div>

              {faculty.length < total && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => loadFaculty(faculty.length)}
                    isLoading={loadingMore}
                  >
                    {`Load more (${total - faculty.length} left)`}
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
