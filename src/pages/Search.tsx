import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";

import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getInitials } from "@/utils/user-utils";
import { getCommunityKindMeta } from "@/integrations/supabase/services/communities";
import { CampusAIOverview } from "@/components/search/CampusAIOverview";
import { parseQuery } from "@/lib/search/query-engine";

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
  blog: {
    icon: BookOpen,
    emptyLine1: "No blog articles matched",
    emptyLine2: "Try a topic or tag",
    color: "text-slate-500",
  },
};

// ─── Subcomponents ───────────────────────────────────────────────────────────

/** Avatar + title + subtitle card used for people (mentors, faculty). */
function PersonCard({ item, to }: { item: SearchResultItem; to: string }) {
  const navigate = useNavigate();
  const rating = item.meta?.avg_overall ?? item.meta?.rating;
  const ratingCount = item.meta?.rating_count ?? item.meta?.review_count;

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "group flex items-start gap-3 w-full rounded-xl border border-border/50 bg-card/60 p-3",
        "hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm transition-all duration-200 text-left",
      )}
    >
      <Avatar className="h-10 w-10 shrink-0 border border-border/50 group-hover:border-primary/30 transition-colors">
        <AvatarImage src={item.image ?? undefined} alt="" />
        <AvatarFallback className="text-xs font-medium">{getInitials(item.title)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-sm text-foreground/90 group-hover:text-foreground">
          {item.title}
        </p>
        <p className="truncate text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
        {typeof rating === "number" && rating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-medium text-foreground/70">
              {rating.toFixed(1)}
              {typeof ratingCount === "number" && ratingCount > 0 && (
                <span className="text-muted-foreground font-normal ml-1">({ratingCount})</span>
              )}
            </span>
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </button>
  );
}

/** Name + interests only, no navigation. */
function StudentCard({ item }: { item: SearchResultItem }) {
  const interests = Array.isArray(item.meta?.interests)
    ? (item.meta!.interests as unknown[]).filter((v): v is string => typeof v === "string")
    : [];

  return (
    <div className="flex items-start gap-3 w-full rounded-xl border border-border/50 bg-card/60 p-3">
      <Avatar className="h-10 w-10 shrink-0 border border-border/50">
        <AvatarImage src={item.image ?? undefined} alt="" />
        <AvatarFallback className="text-xs font-medium">{getInitials(item.title)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-sm text-foreground/90">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground mt-0.5">
          {interests.length > 0 ? interests.slice(0, 3).join(", ") : "Student"}
        </p>
      </div>
    </div>
  );
}

/** Icon + title + subtitle card used for communities, posts, opportunities, blog. */
function ContentCard({
  item,
  to,
  icon: FallbackIcon,
  iconClass,
}: {
  item: SearchResultItem;
  to: string;
  icon: React.ElementType;
  iconClass: string;
}) {
  const navigate = useNavigate();
  const KindIcon = item.meta?.kind ? getCommunityKindMeta(item.meta.kind as string)?.icon : null;
  const Icon = KindIcon ?? FallbackIcon;

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        "group flex items-start gap-3 w-full rounded-xl border border-border/50 bg-card/60 p-3",
        "hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm transition-all duration-200 text-left",
      )}
    >
      {item.image ? (
        <img
          src={item.image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover border border-border/50"
        />
      ) : (
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", iconClass)}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-sm text-foreground/90 group-hover:text-foreground">
          {item.title}
        </p>
        <p className="truncate text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </button>
  );
}

function renderItem(item: SearchResultItem, tab: SearchTab) {
  if (tab === "mentors") return <PersonCard key={item.id} item={item} to={item.to} />;
  if (tab === "faculty") return <PersonCard key={item.id} item={item} to={item.to} />;
  if (tab === "opportunities")
    return (
      <ContentCard
        key={item.id}
        item={item}
        to={item.to}
        icon={Trophy}
        iconClass="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
    );
  if (tab === "communities")
    return (
      <ContentCard
        key={item.id}
        item={item}
        to={item.to}
        icon={GroupsIcon}
        iconClass="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      />
    );
  if (tab === "posts")
    return (
      <ContentCard
        key={item.id}
        item={item}
        to={item.to}
        icon={PostIcon}
        iconClass="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      />
    );
  if (tab === "blog")
    return (
      <ContentCard
        key={item.id}
        item={item}
        to={item.to}
        icon={BookOpen}
        iconClass="border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
      />
    );
  return null;
}

/** One horizontal category section in the "All" dashboard view. */
function CategorySection({
  title,
  tab,
  items,
  count,
  onSeeAll,
}: {
  title: string;
  tab: Exclude<SearchTab, "all">;
  items: SearchResultItem[];
  count: number;
  onSeeAll: () => void;
}) {
  if (items.length === 0) return null;
  const meta = TAB_META[tab];
  const Icon = meta.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", meta.color)} />
          <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">{title}</h2>
          {count > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {count > items.length && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-xs text-primary/70 hover:text-primary transition-colors group"
          >
            <span>See all {count}</span>
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((item) => renderItem(item, tab))}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { q, tab } = parseSearchParams(searchParams);
  const [localQ, setLocalQ] = useState(q);
  const [isAiMode, setIsAiMode] = useState(true);
  const [offset, setOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local input in sync when URL changes
  useEffect(() => {
    setLocalQ(q);
    setOffset(0);
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
    results.counts.blog;

  const isEmpty = !results.loading && q.trim() && totalAcrossAll === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto max-w-5xl px-4 py-3">
          {/* Search bar row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="relative flex-1 flex items-center">
              {isAiMode ? (
                <Sparkles className="absolute left-3 h-4 w-4 text-violet-500 dark:text-violet-400 shrink-0 pointer-events-none animate-pulse" />
              ) : (
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground/60 shrink-0 pointer-events-none" />
              )}
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
                    ? 'Ask CampusMind: "Which professor is best for DSA?" or "Find ML mentors..."'
                    : "Search mentors, faculty, hackathons, groups, posts…"
                }
                className={cn(
                  "w-full h-10 rounded-xl border pl-9 pr-28 text-sm transition-all shadow-2xs",
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
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
                    isAiMode
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs ring-1 ring-violet-400/40"
                      : "border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                  title="Toggle AI Mode (Press Tab)"
                >
                  <Sparkles className={cn("h-3 w-3", isAiMode ? "text-violet-200" : "text-violet-500")} />
                  <span className="hidden sm:inline text-[11px]">{isAiMode ? "AI Active" : "AI Mode"}</span>
                </button>
              </div>
            </div>
            <Button onClick={() => submitSearch(localQ)} size="sm" className="shrink-0 h-10 px-4 rounded-xl">
              Search
            </Button>
          </div>

          {/* Tab strip */}
          {q && (
            <div className="flex items-center gap-1 mt-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {SEARCH_TABS.map((t) => {
                const count = t === "all" ? null : results.counts[t];
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    )}
                  >
                    {TAB_LABELS[t]}
                    {count !== null && count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {/* No query yet — prompt */}
        {!q && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-4 border border-border/50">
              <Search className="h-7 w-7 opacity-40" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Search Friendly Learning</h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              Find mentors, faculty, hackathons, groups, posts and articles across SRM-AP.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {q && results.loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Searching…</span>
          </div>
        )}

        {/* Typo / Did You Mean Suggestion */}
        {q && !results.loading && results.suggestedCorrection && results.suggestedCorrection.toLowerCase() !== q.toLowerCase() && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              Did you mean:{" "}
              <button
                onClick={() => submitSearch(results.suggestedCorrection!)}
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                "{results.suggestedCorrection}"
              </button>
              ?
            </span>
          </div>
        )}

        {/* Campus AI Overview (AI Mode) */}
        {q && !results.loading && !isEmpty && (
          <CampusAIOverview query={q} results={results} className="mb-6" />
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

        {/* Results — All tab: multi-column dashboard */}
        {q && !results.loading && tab === "all" && !isEmpty && (() => {
          const parsed = parseQuery(q);

          const facultySection = (
            <CategorySection
              key="faculty"
              title="Faculty"
              tab="faculty"
              items={results.faculty}
              count={results.counts.faculty}
              onSeeAll={() => setTab("faculty")}
            />
          );

          const mentorsSection = (
            <CategorySection
              key="mentors"
              title="Mentors"
              tab="mentors"
              items={results.mentors}
              count={results.counts.mentors}
              onSeeAll={() => setTab("mentors")}
            />
          );

          const oppSection = (
            <CategorySection
              key="opportunities"
              title="Hackathons & Contests"
              tab="opportunities"
              items={results.opportunities}
              count={results.counts.opportunities}
              onSeeAll={() => setTab("opportunities")}
            />
          );

          const communitySection = (
            <CategorySection
              key="communities"
              title="Groups"
              tab="communities"
              items={results.communities}
              count={results.counts.communities}
              onSeeAll={() => setTab("communities")}
            />
          );

          const postSection = (
            <CategorySection
              key="posts"
              title="Posts"
              tab="posts"
              items={results.posts}
              count={results.counts.posts}
              onSeeAll={() => setTab("posts")}
            />
          );

          const blogSection = (
            <CategorySection
              key="blog"
              title="Blog"
              tab="blog"
              items={results.blog}
              count={results.counts.blog}
              onSeeAll={() => setTab("blog")}
            />
          );

          const studentsSection = results.students.length > 0 ? (
            <div key="students" className="space-y-2">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Students</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {results.students.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {results.students.map((item) => (
                  <StudentCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null;

          let orderedSections = [
            mentorsSection,
            studentsSection,
            facultySection,
            oppSection,
            communitySection,
            postSection,
            blogSection,
          ];

          if (parsed.intent === "informational") {
            orderedSections = [
              blogSection,
              postSection,
              mentorsSection,
              facultySection,
              communitySection,
              oppSection,
              studentsSection,
            ];
          } else if (parsed.intent === "domain_subject") {
            orderedSections = [
              facultySection,
              mentorsSection,
              oppSection,
              communitySection,
              postSection,
              studentsSection,
              blogSection,
            ];
          } else if (parsed.intent === "entity_lookup") {
            orderedSections = [
              facultySection,
              mentorsSection,
              studentsSection,
              communitySection,
              postSection,
              oppSection,
              blogSection,
            ];
          } else if (parsed.intent === "opportunity") {
            orderedSections = [
              oppSection,
              communitySection,
              mentorsSection,
              facultySection,
              studentsSection,
              postSection,
              blogSection,
            ];
          } else if (parsed.intent === "community") {
            orderedSections = [
              communitySection,
              postSection,
              oppSection,
              mentorsSection,
              facultySection,
              studentsSection,
              blogSection,
            ];
          } else if (parsed.intent === "post") {
            orderedSections = [
              postSection,
              communitySection,
              mentorsSection,
              facultySection,
              studentsSection,
              oppSection,
              blogSection,
            ];
          }

          return (
            <div className="space-y-7">
              <p className="text-xs text-muted-foreground">
                Showing top results across all categories for <strong className="text-foreground">"{q}"</strong>
              </p>
              {orderedSections}
            </div>
          );
        })()}

        {/* Results — Single-category tab: full grid */}
        {q && !results.loading && tab !== "all" && !isEmpty && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {results.total > 0 ? (
                  <>
                    {results.total} result{results.total !== 1 ? "s" : ""} for{" "}
                    <strong className="text-foreground">"{q}"</strong>
                  </>
                ) : (
                  <>
                    Results for <strong className="text-foreground">"{q}"</strong>
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(tab === "mentors"
                ? results.mentors
                : tab === "faculty"
                ? results.faculty
                : tab === "opportunities"
                ? results.opportunities
                : tab === "communities"
                ? results.communities
                : tab === "posts"
                ? results.posts
                : results.blog
              ).map((item) => renderItem(item, tab))}
            </div>

            {results.hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setOffset((prev) => prev + 20)} className="rounded-xl">
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
