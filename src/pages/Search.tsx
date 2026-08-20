import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Search,
  Trophy,
  X,
  ChevronRight,
  Star,
  Users2,
  Sparkles,
  SlidersHorizontal,
  Compass,
  Filter,
  FileText,
} from "lucide-react";

import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import { CampusMindIcon } from "@/components/icons/CampusMindIcon";
import { CampusThinkingStatus } from "@/components/search/CampusThinkingStatus";
import { GoogleResultCard } from "@/components/search/GoogleResultCard";
import { FeaturedKnowledgeCard } from "@/components/search/FeaturedKnowledgeCard";
import { RelatedSearches } from "@/components/search/RelatedSearches";
import { CampusAIOverview } from "@/components/search/CampusAIOverview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  parseSearchParams,
  buildSearchUrl,
  SEARCH_TABS,
  TAB_LABELS,
  type SearchTab,
} from "@/lib/search/search-params";
import { useSearchResults, type SearchResultItem } from "@/hooks/useSearchResults";
import { parseQuery, calculateExactBoost, CAMPUS_DEPARTMENTS } from "@/lib/search/query-engine";

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
const MIN_FACULTY_RELEVANCE_ALL = 30; // strict greater-than: >30 means at least one genuine match signal

// ─── Per-category metadata ──────────────────────────────────────────────────

const TAB_META: Record<
  SearchTab,
  { icon: React.ElementType; emptyLine1: string; emptyLine2: string; color: string }
> = {
  all: {
    icon: Search,
    emptyLine1: "No results found",
    emptyLine2: "Try different keywords or check spelling",
    color: "text-primary",
  },
  mentors: {
    icon: MentorIcon,
    emptyLine1: "No mentors matched",
    emptyLine2: "Try searching by name, department or skill",
    color: "text-violet-500",
  },
  faculty: {
    icon: FacultyIcon,
    emptyLine1: "No faculty matched",
    emptyLine2: "Try a name, department or subject",
    color: "text-rose-500",
  },
  opportunities: {
    icon: Trophy,
    emptyLine1: "No opportunities matched",
    emptyLine2: "Try hackathons, competitions or internships",
    color: "text-amber-500",
  },
  communities: {
    icon: GroupsIcon,
    emptyLine1: "No groups matched",
    emptyLine2: "Try a topic or group type",
    color: "text-emerald-500",
  },
  posts: {
    icon: PostIcon,
    emptyLine1: "No posts matched",
    emptyLine2: "Try a topic, keyword or author name",
    color: "text-amber-500",
  },
  documents: {
    icon: FileText,
    emptyLine1: "No documents or policies matched",
    emptyLine2: "Try keywords from Code of Conduct or Academic Calendar",
    color: "text-sky-500",
  },
  blog: {
    icon: BookOpen,
    emptyLine1: "No blog articles matched",
    emptyLine2: "Try a topic or tag",
    color: "text-slate-500",
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

  const isEmpty = !results.loading && q.trim() && totalAcrossAll === 0;

  // Determine if there is a top entity hit for Featured Knowledge Panel
  // Only triggers for genuine exact person/entity lookups, NEVER on broad category queries
  const topEntityHit = useMemo(() => {
    if (!q || results.loading || isEmpty) return null;
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
  }, [q, results, isEmpty]);

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
      <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          {/* Search bar row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 flex items-center justify-center h-10 w-10 rounded-xl border border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground/60 shrink-0 pointer-events-none" />
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
                    ? 'Ask CampusMind: "Computer Science faculty" or "Web Dev mentors…"'
                    : "Search mentors, faculty, hackathons, groups, posts…"
                }
                className={cn(
                  "w-full h-10 sm:h-11 rounded-xl border pl-10 pr-28 text-sm transition-all shadow-2xs",
                  isAiMode
                    ? "border-violet-500/50 bg-gradient-to-r from-violet-500/[0.08] via-purple-500/[0.04] to-transparent ring-2 ring-violet-500/20 shadow-sm shadow-violet-500/10 focus:border-violet-500/70 focus:bg-card text-foreground"
                    : "border-border/60 bg-card/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:bg-card text-foreground",
                  "placeholder:text-muted-foreground/50",
                  "focus:outline-none",
                  "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
                )}
                aria-label="Search query"
                autoFocus={!q}
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {localQ && (
                  <button
                    onClick={() => {
                      setLocalQ("");
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAiMode((prev) => !prev)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
                    isAiMode
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs ring-1 ring-violet-400/40"
                      : "border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  title="Toggle AI Mode (Press Tab)"
                >
                  <CampusMindIcon className={cn("h-3.5 w-3.5", isAiMode ? "text-violet-200" : "text-violet-500")} />
                  <span className="hidden sm:inline text-[11px]">{isAiMode ? "AI Active" : "AI Mode"}</span>
                </button>
              </div>
            </div>
            <Button onClick={() => submitSearch(localQ)} size="sm" className="shrink-0 h-10 sm:h-11 px-5 rounded-xl font-medium">
              Search
            </Button>
          </div>

          {/* Google Tabs Strip */}
          {q && (
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pt-1">
              {SEARCH_TABS.map((t) => {
                const count = t === "all" ? null : results.counts[t];
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                    )}
                  >
                    <span>{TAB_LABELS[t]}</span>
                    {typeof count === "number" && (
                      <span
                        className={cn(
                          "ml-0.5 rounded-full px-1.5 py-0.2 text-[11px] font-semibold",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
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
          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Popular searches
            </p>
            <div className="flex flex-wrap gap-2">
              {["Machine Learning faculty", "Python mentors", "SIH Hackathon teams", "DSA questions", "Electives guide"].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => submitSearch(suggestion)}
                  className="rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading state with dynamic CampusMind thinking status */}
        {q && results.loading && (
          <CampusThinkingStatus
            className="py-16"
            iconSize="h-9 w-9"
            textSize="text-sm sm:text-base"
            phrases={[
              "Searching across SRM-AP with CampusMind…",
              "Finding matched mentors, faculty & groups…",
              "Analyzing relevant courses & research areas…",
              "Connecting peer opportunities…",
              "Synthesizing results…",
            ]}
          />
        )}

        {/* Typo / Did You Mean Suggestion */}
        {q && !results.loading && results.suggestedCorrection && results.suggestedCorrection.toLowerCase() !== q.toLowerCase() && (
          <div className="mb-4 flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
            <span>
              Did you mean:{" "}
              <button
                onClick={() => submitSearch(results.suggestedCorrection!)}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                "{results.suggestedCorrection}"
              </button>
              ?
            </span>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4 border border-border/50">
              <Search className="h-6 w-6 opacity-40" />
            </div>
            <p className="font-semibold text-foreground mb-1">Nothing matched "{q}"</p>
            <p className="text-sm text-muted-foreground max-w-xs">{TAB_META[tab].emptyLine2}</p>
          </div>
        )}

        {/* Results Main Content Stream */}
        {q && !results.loading && !isEmpty && (
          <div className="space-y-6">
            {/* Top result info / count metadata */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>
                About <strong className="text-foreground">{tab === "all" ? totalAcrossAll : results.total}</strong> results for{" "}
                <strong className="text-foreground">"{q}"</strong>
              </p>
            </div>

            {/* Campus AI Overview (Google SGE Style) */}
            {tab === "all" && isAiMode && (
              <CampusAIOverview
                query={q}
                results={results}
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
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", meta.color)} />
                        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                          {title}
                        </h2>
                        {count > 0 && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                            {count}
                          </span>
                        )}
                      </div>
                      {count > items.length && (
                        <button
                          onClick={() => setTab(categoryTab)}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline group"
                        >
                          <span>See all {count} {title.toLowerCase()}</span>
                          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
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
                "Faculty & Research",
                "faculty",
                relevantFacultyForAll,
                results.counts.faculty,
              );

              const mentorsSection = renderSection(
                "Senior Mentors",
                "mentors",
                results.mentors,
                results.counts.mentors,
              );

              const oppSection = renderSection(
                "Hackathons & Competitions",
                "opportunities",
                results.opportunities,
                results.counts.opportunities,
              );

              const communitySection = renderSection(
                "Student Groups",
                "communities",
                results.communities,
                results.counts.communities,
              );

              const postSection = renderSection(
                "Campus Posts & Discussions",
                "posts",
                results.posts,
                results.counts.posts,
              );

              const documentsSection = renderSection(
                "Campus Documents & Guidelines",
                "documents",
                results.documents,
                results.counts.documents,
              );

              const blogSection = renderSection(
                "Campus Guides",
                "blog",
                results.blog,
                results.counts.blog,
              );

              const studentsSection = results.students.length > 0 ? (
                <section key="students" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <div className="flex items-center gap-2">
                      <Users2 className="h-4 w-4 text-indigo-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Student Profiles
                      </h2>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
                        {results.students.length}
                      </span>
                    </div>
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
                    <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Filter:
                    </span>
                    <button
                      onClick={() => setDepartmentFilter(null)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
                        !departmentFilter
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      All Departments
                    </button>
                    {POPULAR_DEPARTMENTS.map((dept) => (
                      <button
                        key={dept.code}
                        onClick={() => setDepartmentFilter(dept.label)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
                          departmentFilter === dept.label
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
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
                      className="rounded-xl px-6"
                    >
                      Load More Results
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
