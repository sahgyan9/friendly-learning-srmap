import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, EyeOff, Search, SlidersHorizontal, ArrowUpDown, Star, X } from "lucide-react";
import { motion } from "framer-motion";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  { value: "rating", label: "Most rated" },
  { value: "reviews", label: "Review count" },
  { value: "name", label: "Name (A–Z)" },
];

const Faculty = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { markSeen } = useHasSeenFacultyRatings();

  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [facets, setFacets] = useState<{ interest: string; count: number }[]>([]);
  const [stats, setStats] = useState({ faculty_count: 0, rating_count: 0, department_count: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<FacultyMember | null>(null);

  const department = searchParams.get("dept") ?? "all";
  const interest = searchParams.get("interest") ?? "";
  const sort = (searchParams.get("sort") as FacultySort) ?? "rating";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    getFacultyDepartments().then(({ data }) => setDepartments(data));
    getFacultyInterestFacets(24).then(({ data }) => setFacets(data));
    getFacultyDirectoryStats().then(({ data }) => setStats(data));
    // Reaching this page is what counts as having discovered the feature; it
    // clears the "New" flags in the nav and on the homepage card.
    markSeen();
  }, [markSeen]);

  const loadFaculty = useCallback(
    async (offset = 0) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { data, total: matched } = await getFacultyList({
        search: debouncedSearch,
        department,
        interest,
        sort,
        limit: PAGE_SIZE,
        offset,
      });

      setFaculty((previous) => (offset === 0 ? data : [...previous, ...data]));
      setTotal(matched);
      setLoading(false);
      setLoadingMore(false);
    },
    [debouncedSearch, department, interest, sort],
  );

  useEffect(() => {
    loadFaculty(0);
  }, [loadFaculty]);

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

          <div className="container mx-auto px-4 pb-8 pt-28">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Pill label — matches FeaturesShowcase numbering */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                <BookOpen className="h-3.5 w-3.5" />
                Faculty
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Faculty Ratings</h1>
                  <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                    Honest, anonymous ratings from SRM AP students on teaching quality, grading fairness
                    and helpfulness. Know what a course is like before you register.
                  </p>
                </div>

                {/* Anonymous badge */}
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                  <EyeOff className="h-3.5 w-3.5" />
                  Ratings are anonymous
                </span>
              </div>

              {/* Stats pills */}
              <div className="mt-5 flex flex-wrap gap-2">
                {stats.faculty_count > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-sm">
                    <BookOpen className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    <strong className="text-rose-600 dark:text-rose-400">{stats.faculty_count}</strong>
                    <span className="text-muted-foreground">faculty</span>
                  </div>
                )}
                {stats.department_count > 0 && (
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm shadow-sm">
                    <strong className="text-foreground">{stats.department_count}</strong>
                    <span className="text-muted-foreground">departments</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <strong className="text-foreground">{stats.rating_count}</strong>
                  <span className="text-muted-foreground">{stats.rating_count === 1 ? "rating" : "ratings"}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl px-4 py-8">
          <header className="sr-only">
            <h2>Browse and filter faculty</h2>
          </header>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
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
            <div className="mb-6 flex flex-wrap items-center gap-2">
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
              <div className="mb-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Browse by research interest
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {facets.map((facet) => (
                    <button
                      key={facet.interest}
                      type="button"
                      onClick={() => updateParam("interest", facet.interest, "")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs transition-colors hover:border-rose-500/30 hover:bg-rose-500/5"
                    >
                      {facet.interest}
                      <span className="tabular-nums text-muted-foreground">{facet.count}</span>
                    </button>
                  ))}
                </div>
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
          loadFaculty(0);
          getFacultyDirectoryStats().then(({ data }) => setStats(data));
        }}
      />
    </>
  );
};

export default Faculty;
