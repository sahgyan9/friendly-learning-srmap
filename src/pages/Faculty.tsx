import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EyeOff, Search, SlidersHorizontal } from "lucide-react";

import Navbar from "@/components/Navbar";
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
  const [stats, setStats] = useState({ faculty_count: 0, rating_count: 0, department_count: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<FacultyMember | null>(null);

  const department = searchParams.get("dept") ?? "all";
  const sort = (searchParams.get("sort") as FacultySort) ?? "rating";
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    getFacultyDepartments().then(({ data }) => setDepartments(data));
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
        sort,
        limit: PAGE_SIZE,
        offset,
      });

      setFaculty((previous) => (offset === 0 ? data : [...previous, ...data]));
      setTotal(matched);
      setLoading(false);
      setLoadingMore(false);
    },
    [debouncedSearch, department, sort],
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
        <Navbar />

        <div className="container mx-auto px-4 py-8 pt-24">
          <header className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">Faculty Ratings</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Honest, anonymous ratings from SRM AP students on teaching quality, grading fairness
              and helpfulness. Know what a course is like before you register.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {stats.faculty_count > 0 && (
                <span>
                  <strong className="text-foreground">{stats.faculty_count}</strong> faculty
                </span>
              )}
              {stats.department_count > 0 && (
                <span>
                  <strong className="text-foreground">{stats.department_count}</strong> departments
                </span>
              )}
              <span>
                <strong className="text-foreground">{stats.rating_count}</strong>{" "}
                {stats.rating_count === 1 ? "rating" : "ratings"}
              </span>
              <span className="flex items-center gap-1 text-xs">
                <EyeOff className="h-3.5 w-3.5" />
                Ratings are anonymous
              </span>
            </div>
          </header>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, department or designation..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
                aria-label="Search faculty"
              />
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
                {search || department !== "all"
                  ? "Try a different search or department."
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
