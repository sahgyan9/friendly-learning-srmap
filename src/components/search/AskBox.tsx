import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  ArrowRight,
  BookOpen,
  Trophy,
  CornerDownLeft,
} from "lucide-react";

import {
  EXAMPLE_QUESTIONS,
  EXAMPLE_ROTATION_MS,
  SEARCH_BRAND,
} from "@/lib/search/brand";
import { OPEN_SEARCH_EVENT } from "@/lib/search/events";
import { cn } from "@/lib/utils";
import { useSiteSearch, type SearchHit } from "@/hooks/useSiteSearch";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { Badge } from "@/components/ui/badge";

/**
 * The hero's front door to search.
 *
 * Offers an inline expandable search input with instant preview hits on desktop,
 * and seamlessly hands off to the command palette on mobile or via Ctrl+D.
 */
const AskBox = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Read user agent on client only (homepage is pre-rendered)
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  // Rotate placeholder questions when inactive
  useEffect(() => {
    if (reduceMotion || isActive) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % EXAMPLE_QUESTIONS.length),
      EXAMPLE_ROTATION_MS,
    );
    return () => clearInterval(id);
  }, [reduceMotion, isActive]);

  // Click outside listener to collapse inline search
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsActive(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isActive]);

  const openCommandPalette = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
  };

  const handleBoxClick = () => {
    // On small mobile screens (<640px), open the command dialog for clean keyboard management
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      openCommandPalette();
      return;
    }

    setIsActive(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Perform live search when active and query >= 2 characters
  const searchEnabled = isActive && query.trim().length >= 2;
  const { results, loading, isEmpty } = useSiteSearch(query, searchEnabled);

  // Flatten top hits for keyboard navigation
  const allHits = [
    ...results.faculty.slice(0, 3),
    ...results.mentors.slice(0, 3),
    ...results.posts.slice(0, 2),
    ...results.communities.slice(0, 2),
    ...results.opportunities.slice(0, 2),
    ...results.articles.slice(0, 2),
    ...results.related.slice(0, 2),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsActive(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allHits.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allHits.length - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allHits.length) {
        const hit = allHits[selectedIndex];
        navigate(hit.to);
        setIsActive(false);
      } else if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsActive(false);
      }
    }
  };

  const renderHitIcon = (kind: SearchHit["kind"]) => {
    switch (kind) {
      case "faculty":
        return <FacultyIcon className="h-3.5 w-3.5 text-rose-500" />;
      case "mentor":
        return <MentorIcon className="h-3.5 w-3.5 text-violet-500" />;
      case "community":
        return <GroupsIcon className="h-3.5 w-3.5 text-emerald-500" />;
      case "post":
        return <PostIcon className="h-3.5 w-3.5 text-amber-500" />;
      case "opportunity":
        return <Trophy className="h-3.5 w-3.5 text-amber-500" />;
      case "article":
      case "blog_post":
        return <BookOpen className="h-3.5 w-3.5 text-slate-500" />;
      default:
        return <CampusBrainIcon className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const renderSection = (
    title: string,
    hits: SearchHit[],
    startIndex: number,
  ) => {
    if (hits.length === 0) return null;

    return (
      <div className="py-1.5">
        <div className="px-3 pb-1 text-3xs font-bold uppercase tracking-wider text-muted-foreground/70">
          {title}
        </div>
        <div className="space-y-0.5">
          {hits.map((hit, idx) => {
            const hitIndex = startIndex + idx;
            const isSelected = selectedIndex === hitIndex;

            return (
              <button
                key={hit.id || `${hit.kind}-${hit.title}`}
                type="button"
                onClick={() => {
                  navigate(hit.to);
                  setIsActive(false);
                }}
                onMouseEnter={() => setSelectedIndex(hitIndex)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background border border-border/70 shadow-2xs">
                    {renderHitIcon(hit.kind)}
                  </span>
                  <div className="min-w-0 truncate">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {hit.title}
                    </p>
                    {hit.subtitle && (
                      <p className="truncate text-3xs text-muted-foreground">
                        {hit.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Badge
                    variant="outline"
                    className="capitalize text-3xs px-1.5 py-0 h-4 border-border/70 font-normal"
                  >
                    {hit.kind}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto w-full max-w-2xl transition-all",
        isActive ? "z-50" : "z-10",
        className,
      )}
    >
      <div className="group relative">
        {/* Glow behind the input */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-1 rounded-[1.25rem] bg-primary/20 opacity-40 blur-lg transition-opacity duration-500 motion-reduce:transition-none",
            isActive ? "opacity-75" : "group-hover:opacity-75",
          )}
        />

        {/* 1px subtle gradient ring */}
        <div
          className={cn(
            "relative rounded-2xl p-px transition-all duration-300",
            isActive
              ? "bg-gradient-to-r from-primary/60 via-primary/40 to-primary/60 shadow-md ring-2 ring-primary/20"
              : "bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30",
          )}
        >
          {!isActive ? (
            /* Resting State Button */
            <button
              type="button"
              onClick={handleBoxClick}
              aria-label={`Open ${SEARCH_BRAND} search`}
              className="flex w-full items-center gap-3 rounded-[calc(1rem-1px)] bg-background px-4 py-3.5 text-left transition-colors duration-300 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-4 sm:px-5 sm:py-4 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Search className="h-4 w-4" aria-hidden />
              </span>

              {/* Fixed height and clipped rotating text */}
              <span className="relative h-6 min-w-0 flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={EXAMPLE_QUESTIONS[index]}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex items-center truncate text-sm text-muted-foreground sm:text-base"
                  >
                    {EXAMPLE_QUESTIONS[index]}
                  </motion.span>
                </AnimatePresence>
              </span>

              {/* AI Mode badge on landing page */}
              <button
                type="button"
                onClick={openCommandPalette}
                className="shrink-0 flex items-center rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary shadow-2xs hover:bg-primary/20 transition-colors"
                title="Open command palette search"
              >
                <span>AI Mode</span>
              </button>

              <kbd className="ml-1 hidden shrink-0 items-center gap-0.5 rounded border border-border/60 bg-muted/80 px-1.5 py-0.5 font-mono text-3xs font-medium text-muted-foreground sm:inline-flex">
                {isMac ? "⌘" : "Ctrl"} D
              </kbd>
            </button>
          ) : (
            /* Active Inline Search Form */
            <div className="flex w-full items-center gap-3 rounded-[calc(1rem-1px)] bg-background px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <Search className="h-4 w-4" aria-hidden />
              </span>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about faculty, mentors, posts, groups..."
                className="h-9 min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-base"
                aria-label="Search campus"
              />

              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              )}

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                  aria-label="Clear search query"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (query.trim()) {
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                    setIsActive(false);
                  }
                }}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors shrink-0"
              >
                <span>Search</span>
                <CornerDownLeft className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Inline Expandable Dropdown (Desktop) */}
        {isActive && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-card text-card-foreground p-2 shadow-2xl backdrop-blur-xl ring-1 ring-border/50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 px-1 [scrollbar-width:thin]">
              {loading && allHits.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Searching campus knowledge...</span>
                </div>
              ) : isEmpty && !loading ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-xs font-medium text-foreground">
                    No instant matches for &ldquo;{query}&rdquo;
                  </p>
                  <p className="mt-1 text-3xs text-muted-foreground">
                    Press Enter to search with full semantic AI in CampusBrain.
                  </p>
                </div>
              ) : (
                <>
                  {renderSection("Faculty", results.faculty.slice(0, 3), 0)}
                  {renderSection(
                    "Mentors",
                    results.mentors.slice(0, 3),
                    results.faculty.slice(0, 3).length,
                  )}
                  {renderSection(
                    "Campus Posts",
                    results.posts.slice(0, 2),
                    results.faculty.slice(0, 3).length +
                      results.mentors.slice(0, 3).length,
                  )}
                  {renderSection(
                    "Groups & Communities",
                    results.communities.slice(0, 2),
                    results.faculty.slice(0, 3).length +
                      results.mentors.slice(0, 3).length +
                      results.posts.slice(0, 2).length,
                  )}
                  {renderSection(
                    "Opportunities",
                    results.opportunities.slice(0, 2),
                    results.faculty.slice(0, 3).length +
                      results.mentors.slice(0, 3).length +
                      results.posts.slice(0, 2).length +
                      results.communities.slice(0, 2).length,
                  )}
                  {renderSection(
                    "Articles & Guides",
                    results.articles.slice(0, 2),
                    results.faculty.slice(0, 3).length +
                      results.mentors.slice(0, 3).length +
                      results.posts.slice(0, 2).length +
                      results.communities.slice(0, 2).length +
                      results.opportunities.slice(0, 2).length,
                  )}
                  {renderSection(
                    "Semantic Matches",
                    results.related.slice(0, 2),
                    results.faculty.slice(0, 3).length +
                      results.mentors.slice(0, 3).length +
                      results.posts.slice(0, 2).length +
                      results.communities.slice(0, 2).length +
                      results.opportunities.slice(0, 2).length +
                      results.articles.slice(0, 2).length,
                  )}
                </>
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="flex items-center justify-between border-t border-border/60 px-3 pt-2 pb-1 text-3xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-border/70 bg-muted px-1 py-0.5 font-mono">
                  ↑↓
                </kbd>
                Navigate
                <kbd className="ml-1 rounded border border-border/70 bg-muted px-1 py-0.5 font-mono">
                  ↵
                </kbd>
                Select
                <kbd className="ml-1 rounded border border-border/70 bg-muted px-1 py-0.5 font-mono">
                  Esc
                </kbd>
                Close
              </span>

              <button
                type="button"
                onClick={() => {
                  navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  setIsActive(false);
                }}
                className="flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <span>Full CampusBrain results</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AskBox;

