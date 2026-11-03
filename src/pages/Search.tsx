import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Search,
  Trophy,
  X,
  ChevronRight,
  Users2,
  Filter,
  FileText,
} from "lucide-react";

import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { CampusThinkingStatus } from "@/components/search/CampusThinkingStatus";
import { GoogleResultCard } from "@/components/search/GoogleResultCard";
import { FeaturedKnowledgeCard } from "@/components/search/FeaturedKnowledgeCard";
import { RelatedSearches } from "@/components/search/RelatedSearches";
import { CampusAIOverview } from "@/components/search/CampusAIOverview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  parseSearchParams,
  buildSearchUrl,
  SEARCH_TABS,
  TAB_LABELS,
  type SearchTab,
} from "@/lib/search/search-params";
import { useCollapseOnScroll } from "@/hooks/useCollapseOnScroll";
import { useSearchResults, type SearchResultItem } from "@/hooks/useSearchResults";
import { useCampusAIOverview } from "@/hooks/useCampusAIOverview";
import { parseQuery, calculateExactBoost, CAMPUS_DEPARTMENTS } from "@/lib/search/query-engine";
import { MIN_FACULTY_RELEVANCE } from "@/lib/search/relevance";

// ─── Relevance threshold for the "all" tab ──────────────────────────────────
//
// Faculty are fetched via a broad ilike keyword search sorted by rating.
// That means a top-rated Mechanical Engineering professor can appear on a
// "Web Development DSA" search because the word "Development" matched his
// research text. We suppress those false positives by requiring the
// relevanceScore to be strictly above the base value (100).
//
// Score anatomy for keyword-fetched faculty:
//   base            = 100  (no match at all — filtered out in "all" tab)
//   + interestBoost = 40 × # subject-token hits in interests/research_areas
//   + deptBoost     = 200  (query's detectedDepartment matched this faculty)
//   + boost × 50        (name token exact-match signal)
//
// Semantic-only faculty arrive with relevanceScore = similarity × 80 (<100),
// so they are never caught by this filter and always shown when relevant.
//
// Threshold lives with the scale it is expressed in — see relevance.ts.
const MIN_FACULTY_RELEVANCE_ALL = MIN_FACULTY_RELEVANCE;

// ─── Per-category metadata ──────────────────────────────────────────────────

const TAB_META: Record<
  SearchTab,
  { icon: React.ElementType; emptyLine1: string; emptyLine2: string }
> = {
  all: {
    icon: Search,
    emptyLine1: "No results found",
    emptyLine2: "Try different keywords or check spelling",
  },
  mentors: {
    icon: MentorIcon,
    emptyLine1: "No mentors matched",
    emptyLine2: "Try searching by name, department or skill",
  },
  faculty: {
    icon: FacultyIcon,
    emptyLine1: "No faculty matched",
    emptyLine2: "Try a name, department or subject",
  },
  opportunities: {
    icon: Trophy,
    emptyLine1: "No opportunities matched",
    emptyLine2: "Try hackathons, competitions or internships",
  },
  communities: {
    icon: GroupsIcon,
    emptyLine1: "No groups matched",
    emptyLine2: "Try a topic or group type",
  },
  posts: {
    icon: PostIcon,
    emptyLine1: "No posts matched",
    emptyLine2: "Try a topic, keyword or author name",
  },
  documents: {
    icon: FileText,
    emptyLine1: "No documents or policies matched",
    emptyLine2: "Try keywords from Code of Conduct or Academic Calendar",
  },
  blog: {
    icon: BookOpen,
    emptyLine1: "No blog articles matched",
    emptyLine2: "Try a topic or tag",
  },
};

const POPULAR_DEPARTMENTS = [
  { code: "cse", label: "Computer Science" },
  { code: "ece", label: "Electronics (ECE)" },
  { code: "me", label: "Mechanical" },
  { code: "bio", label: "Biological Sciences" },
  { code: "math", label: "Mathematics" },
  { code: "phys", label: "Physics" },
  { code: "mgmt", label: "Management" },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { q, tab } = parseSearchParams(searchParams);
  const [localQ, setLocalQ] = useState(q);
  const [isAiMode, setIsAiMode] = useState(true);
  const [offset, setOffset] = useState(0);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [citedUrlsMap, setCitedUrlsMap] = useState<Map<string, number>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Same (threshold, collapsibleHeight) as SiteHeader's own call so this
  // resolves in lockstep with it — both read the same window.scrollY on the
  // same rAF tick, so they collapse and expand on the same frame without any
  // cross-component wiring. When SiteHeader is gone this docks at the very
  // top instead of leaving a blank 64px gap where it used to be.
  const siteHeaderCollapsed = useCollapseOnScroll(96, 64);

  const handleCitationsLoaded = useCallback((citations: { id: number; text: string; url: string }[]) => {
    const map = new Map<string, number>();
    citations.forEach((c) => {
      if (c.url) map.set(c.url.toLowerCase(), c.id);
    });
    setCitedUrlsMap(map);
  }, []);

  // Keep local input in sync when URL changes
  useEffect(() => {
    setLocalQ(q);
    setOffset(0);
    setCitedUrlsMap(new Map());
  }, [q]);

  const results = useSearchResults(q, tab, offset);

  const aiOverview = useCampusAIOverview({
    query: q,
    enabled: isAiMode && tab === "all",
    onCitationsLoaded: handleCitationsLoaded,
  });

  const isAiOverviewLoading = isAiMode && tab === "all" && q.trim().length >= 3 && aiOverview.isInitialLoading;
  const isPageLoading = Boolean(q.trim()) && (results.loading || isAiOverviewLoading);

  const setTab = (newTab: SearchTab) => {
    const next = new URLSearchParams(searchParams);
    if (newTab === "all") {
      next.delete("type");
    } else {
      next.set("type", newTab);
    }
    setOffset(0);
    setSearchParams(next, { replace: false });
  };

  const submitSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = new URLSearchParams();
    next.set("q", trimmed);
    if (tab !== "all") {
      next.set("type", tab);
    }
    setOffset(0);
    setSearchParams(next, { replace: false });
  };

  const totalAcrossAll =
    results.counts.mentors +
    results.counts.faculty +
    results.students.length +
    results.counts.opportunities +
    results.counts.communities +
    results.counts.posts +
    results.counts.documents +
    results.counts.blog;

  const isEmpty = !isPageLoading && Boolean(q.trim()) && totalAcrossAll === 0;

  // Determine if there is a top entity hit for Featured Knowledge Panel
  // Only triggers for genuine exact person/entity lookups, NEVER on broad category queries
  const topEntityHit = useMemo(() => {
    if (!q || isPageLoading || isEmpty) return null;
    const parsed = parseQuery(q);

    // If query has specific name tokens or entity intent
    if (parsed.intent === "entity_lookup") {
      if (results.faculty.length > 0) {
        const topFaculty = results.faculty[0];
        const boost = calculateExactBoost(topFaculty.title, q, parsed.nameTokens);
        if (boost >= 0.8) return topFaculty;
      }
      if (results.mentors.length > 0) {
        const topMentor = results.mentors[0];
        const boost = calculateExactBoost(topMentor.title, q, parsed.nameTokens);
        if (boost >= 0.8) return topMentor;
      }
    }
    return null;
  }, [q, results, isEmpty, isPageLoading]);

  // Filtered single-category items if sub-filters active
  const filteredCategoryItems = useMemo(() => {
    let rawItems: SearchResultItem[] = [];
    if (tab === "mentors") rawItems = results.mentors;
    else if (tab === "faculty") rawItems = results.faculty;
    else if (tab === "opportunities") rawItems = results.opportunities;
    else if (tab === "communities") rawItems = results.communities;
    else if (tab === "posts") rawItems = results.posts;
    else if (tab === "documents") rawItems = results.documents;
    else if (tab === "blog") rawItems = results.blog;

    if (!departmentFilter) return rawItems;

    return rawItems.filter((item) => {
      const dept = (item.meta?.department as string || item.subtitle || "").toLowerCase();
      return dept.includes(departmentFilter.toLowerCase());
    });
  }, [tab, results, departmentFilter]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* ── Header ── */}
      {/* top-16 docks this below SiteHeader (h-16, sticky top-0 z-50) instead
          of underneath it — same top-0 offset here used to let the global
          header's higher z-index paint over the search input row while the
          tabs strip below it stayed tall enough to peek out. Drops to top-0
          once SiteHeader collapses away on scroll, so this docks flush at
          the very top instead of leaving a blank 64px gap. */}
      <div
        className={cn(
          "sticky z-20 border-b border-border bg-background transition-[top] duration-300 ease-in-out",
          siteHeaderCollapsed ? "top-0" : "top-16",
        )}
      >
        <div className="container mx-auto max-w-6xl px-4 py-3">
          {/* Search bar row */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground sm:h-11 sm:w-11"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div
              className="relative flex min-w-0 flex-1 items-center rounded-lg border border-border bg-card px-3 text-foreground transition-colors duration-150 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
            >
              <Search className="pointer-events-none mr-2 h-4 w-4 shrink-0 text-muted-foreground sm:mr-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={localQ}
                onChange={(e) => setLocalQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Tab" && !e.shiftKey) {
                    e.preventDefault();
                    setIsAiMode((prev) => !prev);
                  }
                  if (e.key === "Enter") submitSearch(localQ);
                  if (e.key === "Escape") inputRef.current?.blur();
                }}
                placeholder={
                  isAiMode
                    ? "Search or ask a question"
                    : "Search mentors, faculty, hackathons, groups, posts"
                }
                className="w-full h-10 sm:h-11 flex-1 min-w-0 bg-transparent text-base md:text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:outline-none focus:ring-0 p-0 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                aria-label="Search query"
                autoFocus={!q}
              />
              <div className="ml-1.5 flex shrink-0 items-center gap-1 sm:gap-1.5">
                {localQ && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalQ("");
                      inputRef.current?.focus();
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {/* Toggles the CampusBrain answer above the results; aria-pressed carries the state */}
                <button
                  type="button"
                  onClick={() => setIsAiMode((prev) => !prev)}
                  aria-pressed={isAiMode}
                  className={cn(
                    "flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors duration-150",
                    isAiMode
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                  title={isAiMode ? "Hide CampusBrain answer (Tab)" : "Show CampusBrain answer (Tab)"}
                >
                  <CampusBrainIcon animate={false} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Answer</span>
                </button>
              </div>
            </div>
            <Button onClick={() => submitSearch(localQ)} disabled={!localQ.trim()} className="h-10 shrink-0 px-4 sm:h-11 sm:px-5">
              Search
            </Button>
          </div>

          {/* Google Tabs Strip */}
          {q && (
            <div role="tablist" aria-label="Result categories" className="-mb-3 mt-3 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {SEARCH_TABS.map((t) => {
                const count = t === "all" ? null : results.counts[t];
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors duration-150",
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{TAB_LABELS[t]}</span>
                    {typeof count === "number" && count >= 0 && (
                      <span className="tabular text-xs text-muted-foreground">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── SERP Body ── */}
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* No query yet — landing prompt */}
        {!q && (
          <div className="mt-6 max-w-2xl animate-fade-up">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Search</h1>
            <p className="mt-2 text-muted-foreground">
              Find mentors, faculty, hackathons, groups and posts, or ask CampusBrain a question about campus.
            </p>
            <h2 className="mb-3 mt-8 text-sm font-medium text-foreground">Popular searches</h2>
            <div className="flex flex-wrap gap-2">
              {["Machine Learning faculty", "Python mentors", "SIH Hackathon teams", "DSA questions", "Electives guide"].map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => submitSearch(suggestion)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading: a skeleton in the shape of the results, so nothing jumps when they land */}
        {q && isPageLoading && (
          <div className="space-y-6" aria-busy="true">
            <CampusThinkingStatus
              phrases={
                isAiOverviewLoading
                  ? ["Searching campus records", "Reading sources", "Writing the CampusBrain answer"]
                  : ["Searching campus records"]
              }
            />
            {isAiOverviewLoading && (
              <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Typo / Did You Mean Suggestion */}
        {q && !isPageLoading && results.suggestedCorrection && results.suggestedCorrection.toLowerCase() !== q.toLowerCase() && (
          <div className="mb-4 flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <span>
              Did you mean{" "}
              <button
                type="button"
                onClick={() => submitSearch(results.suggestedCorrection!)}
                className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline"
              >
                {results.suggestedCorrection}
              </button>
              ?
            </span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
              <Search className="h-5 w-5" aria-hidden />
            </div>
            <p className="mb-1 font-medium text-foreground">
              {TAB_META[tab].emptyLine1} for &ldquo;{q}&rdquo;
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">{TAB_META[tab].emptyLine2}</p>
            {tab !== "all" ? (
              <Button variant="outline" className="mt-5" onClick={() => setTab("all")}>
                Search all categories
              </Button>
            ) : (
              <Button variant="outline" className="mt-5" onClick={() => inputRef.current?.focus()}>
                Edit search
              </Button>
            )}
          </div>
        )}

        {/* Results Main Content Stream */}
        {q && !isPageLoading && !isEmpty && (
          <div className="space-y-6">
            {/* Top result info / count metadata */}
            <p className="text-sm text-muted-foreground">
              <span className="tabular font-medium text-foreground">{tab === "all" ? totalAcrossAll : results.total}</span> results for{" "}
              <span className="font-medium text-foreground">&ldquo;{q}&rdquo;</span>
            </p>

            {/* Campus AI Overview (Google SGE Style) */}
            {tab === "all" && isAiMode && (
              <CampusAIOverview
                query={q}
                results={results}
                overview={aiOverview.overview}
                loading={aiOverview.loading}
                error={aiOverview.error}
                isFeatureEnabled={aiOverview.isFeatureEnabled}
                onRetry={aiOverview.retry}
                onFeedback={aiOverview.handleFeedback}
                hasVoted={aiOverview.hasVoted}
                isVoting={aiOverview.isVoting}
                onCitationsLoaded={handleCitationsLoaded}
                className="mb-6"
              />
            )}

            {/* Top Featured Knowledge Card if entity matched */}
            {topEntityHit && tab === "all" && (
              <FeaturedKnowledgeCard item={topEntityHit} className="mb-6" />
            )}

            {/* ── Tab === 'all': Ranked Google SERP Sections ── */}
            {tab === "all" && (() => {
              const parsed = parseQuery(q);

              // Category section renderer
              const renderSection = (
                title: string,
                categoryTab: Exclude<SearchTab, "all">,
                items: SearchResultItem[],
                count: number,
              ) => {
                if (items.length === 0) return null;
                const meta = TAB_META[categoryTab];
                const Icon = meta.icon;

                return (
                  <section key={categoryTab} className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
                        {count > 0 && (
                          <span className="tabular text-xs text-muted-foreground">{count}</span>
                        )}
                      </div>
                      {count > items.length && (
                        <button
                          type="button"
                          onClick={() => setTab(categoryTab)}
                          className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          See all <span className="tabular">{count}</span>
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => (
                        <GoogleResultCard
                          key={item.id}
                          item={item}
                          query={q}
                          citationId={item.to ? citedUrlsMap.get(item.to.toLowerCase()) : undefined}
                        />
                      ))}
                    </div>
                  </section>
                );
              };

              // Filter faculty for the "all" tab: only surface those with a genuine
              // topical signal (score > base 30).
              const relevantFacultyForAll = results.faculty.filter(
                (item) => (item.relevanceScore ?? 0) > MIN_FACULTY_RELEVANCE_ALL,
              );
              const facultySection = renderSection(
                "Faculty and research",
                "faculty",
                relevantFacultyForAll,
                results.counts.faculty,
              );

              const mentorsSection = renderSection(
                "Senior mentors",
                "mentors",
                results.mentors,
                results.counts.mentors,
              );

              const oppSection = renderSection(
                "Hackathons and competitions",
                "opportunities",
                results.opportunities,
                results.counts.opportunities,
              );

              const communitySection = renderSection(
                "Student groups",
                "communities",
                results.communities,
                results.counts.communities,
              );

              const postSection = renderSection(
                "Posts and discussions",
                "posts",
                results.posts,
                results.counts.posts,
              );

              const documentsSection = renderSection(
                "Documents and guidelines",
                "documents",
                results.documents,
                results.counts.documents,
              );

              const blogSection = renderSection(
                "Campus guides",
                "blog",
                results.blog,
                results.counts.blog,
              );

              const studentsSection = results.students.length > 0 ? (
                <section key="students" className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <Users2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">Student profiles</h2>
                    <span className="tabular text-xs text-muted-foreground">{results.students.length}</span>
                  </div>

                  <div className="space-y-3">
                    {results.students.map((item) => (
                      <GoogleResultCard
                        key={item.id}
                        item={item}
                        query={q}
                        citationId={item.to ? citedUrlsMap.get(item.to.toLowerCase()) : undefined}
                      />
                    ))}
                  </div>
                </section>
              ) : null;

              const getBestScore = (items: SearchResultItem[]) =>
                items.length > 0 ? Math.max(...items.map((i) => i.relevanceScore ?? 0)) : 0;

              const sectionsWithScores = [
                { section: documentsSection, score: getBestScore(results.documents) },
                { section: mentorsSection, score: getBestScore(results.mentors) },
                { section: facultySection, score: getBestScore(relevantFacultyForAll) },
                { section: oppSection, score: getBestScore(results.opportunities) },
                { section: communitySection, score: getBestScore(results.communities) },
                { section: postSection, score: getBestScore(results.posts) },
                { section: blogSection, score: getBestScore(results.blog) },
                { section: studentsSection, score: getBestScore(results.students) },
              ].filter(s => s.section !== null);

              sectionsWithScores.sort((a, b) => b.score - a.score);

              return (
                <div className="space-y-6">
                  {sectionsWithScores.map(s => s.section)}
                </div>
              );
            })()}

            {/* ── Single-Category Tab: Full Google SERP Listing ── */}
            {tab !== "all" && (
              <div className="space-y-4">
                {/* Sub-filter chips (e.g. Department filter for faculty/mentors) */}
                {(tab === "faculty" || tab === "mentors") && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                    <span className="mr-1 flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Filter className="h-3.5 w-3.5" aria-hidden /> Department
                    </span>
                    <button
                      type="button"
                      aria-pressed={!departmentFilter}
                      onClick={() => setDepartmentFilter(null)}
                      className={cn(
                        "h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
                        !departmentFilter
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      All departments
                    </button>
                    {POPULAR_DEPARTMENTS.map((dept) => (
                      <button
                        key={dept.code}
                        type="button"
                        aria-pressed={departmentFilter === dept.label}
                        onClick={() => setDepartmentFilter(dept.label)}
                        className={cn(
                          "h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
                          departmentFilter === dept.label
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                        )}
                      >
                        {dept.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {filteredCategoryItems.map((item) => (
                    <GoogleResultCard key={item.id} item={item} query={q} />
                  ))}
                </div>

                {results.hasMore && (
                  <div className="flex justify-center pt-6">
                    <Button
                      variant="outline"
                      onClick={() => setOffset((prev) => prev + 20)}
                      isLoading={results.loading}
                      className="px-6"
                    >
                      Load more results
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Related Campus Searches at the bottom */}
            <div className="pt-6">
              <RelatedSearches query={q} onSelectQuery={submitSearch} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
