import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { buildSearchUrl } from "@/lib/search/search-params";
import {
  ChevronRight,
  Moon,
  Search,
  Sun,
  Trophy,
  X,
  BookOpen,
  Loader2,
  History as HistoryIcon,
  TrendingUp,
  PenLine,
} from "lucide-react";

import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { PostIcon } from "@/components/icons/PostIcon";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_SUGGESTION_IDS,
  DESTINATIONS,
  isVisibleTo,
  type SearchDestination,
} from "@/lib/search/destinations";
import { rankDestinations } from "@/lib/search/rank";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { OPEN_NOTIFICATIONS_EVENT, OPEN_SEARCH_EVENT } from "@/lib/search/events";
import { SEARCH_SUGGESTIONS } from "@/lib/search/brand";
import {
  clearSearchHistory,
  getSearchHistory,
  recordSearchHistory,
  removeSearchHistoryEntry,
  type SearchHistoryEntry,
} from "@/lib/search/history";
import { getTrendingSearches, MIN_TRENDING_TO_SHOW, type TrendingSearch } from "@/lib/search/trending";
import { useSiteSearch, type SearchHit } from "@/hooks/useSiteSearch";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";

/**
 * One neutral tile for every row icon. Colour-coding each destination meant
 * nothing a user could learn; the icon shape and the label already say what
 * the row is.
 */
const ICON_TILE =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors duration-150 group-data-[selected=true]:border-primary/30 group-data-[selected=true]:text-primary";

/** Shared row anatomy, so keyboard selection reads the same in every group. */
const ROW =
  "group my-0.5 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 data-[selected=true]:bg-accent";

const CATEGORY_PILLS = [
  { id: "all", label: "All", to: "/search", icon: Search },
  { id: "mentors", label: "Mentors", to: "/mentors", icon: MentorIcon },
  { id: "faculty", label: "Faculty", to: "/faculty", icon: FacultyIcon },
  { id: "opportunities", label: "Hackathons", to: "/opportunities", icon: Trophy },
  { id: "communities", label: "Groups", to: "/communities", icon: GroupsIcon },
  { id: "posts", label: "Posts", to: "/posts", icon: PostIcon },
] as const;

const SiteSearch = () => {
  const navigate = useNavigate();
  const { user, isMentor, isAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isAiMode, setIsAiMode] = useState(false);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isMac, setIsMac] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [trending, setTrending] = useState<TrendingSearch[]>([]);

  const { results: liveResults, loading: liveLoading } = useSiteSearch(query, open);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (open) setThemeState(getTheme());
  }, [open]);

  useEffect(() => {
    if (open && user) {
      getSearchHistory().then(setHistory);
    } else if (!user) {
      setHistory([]);
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    getTrendingSearches(6).then((result) => {
      setTrending(result.length >= MIN_TRENDING_TO_SHOW ? result : []);
    });
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "d" && (event.metaKey || event.ctrlKey) && !event.altKey) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
  }, []);

  const viewer = useMemo(
    () => ({ signedIn: Boolean(user), isMentor, isAdmin }),
    [user, isMentor, isAdmin],
  );

  const available = useMemo(
    () => DESTINATIONS.filter((destination) => isVisibleTo(destination, viewer)),
    [viewer],
  );

  const ranked = useMemo(
    () => (query.trim() ? rankDestinations(available, query, 4) : []),
    [available, query],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setIsAiMode(false);
  }, []);

  const runDestination = useCallback(
    (destination: SearchDestination) => {
      const trimmed = query.trim();

      if (destination.to) {
        if (user && trimmed) recordSearchHistory(trimmed, destination.to);
        close();
        navigate(destination.to);
        return;
      }

      switch (destination.action) {
        case "toggle-theme":
          setThemeState(toggleTheme());
          return;
        case "open-notifications":
          if (user && trimmed) recordSearchHistory(trimmed);
          close();
          window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS_EVENT));
          return;
        default:
          close();
      }
    },
    [close, navigate, query, user],
  );

  const goTo = useCallback(
    (to: string) => {
      close();
      navigate(to);
    },
    [close, navigate],
  );

  const goToSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (user) recordSearchHistory(trimmed);
    close();
    navigate(buildSearchUrl(trimmed, "all"));
  }, [query, close, navigate, user]);

  const runHistoryEntry = useCallback(
    (entry: SearchHistoryEntry) => {
      if (user) recordSearchHistory(entry.query, entry.resultUrl);
      close();
      navigate(entry.resultUrl || buildSearchUrl(entry.query, "all"));
    },
    [close, navigate, user],
  );

  const removeHistoryEntry = useCallback((query: string, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.query !== query));
    removeSearchHistoryEntry(query);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    clearSearchHistory();
  }, []);

  const labelFor = (destination: SearchDestination) =>
    destination.action === "toggle-theme"
      ? theme === "dark"
        ? "Switch to light theme"
        : "Switch to dark theme"
      : destination.label;

  const iconFor = (destination: SearchDestination) =>
    destination.action === "toggle-theme" ? (theme === "dark" ? Sun : Moon) : destination.icon;

  const renderDestination = (destination: SearchDestination) => {
    const Icon = iconFor(destination);
    return (
      <CommandItem
        key={destination.id}
        value={destination.id}
        onSelect={() => runDestination(destination)}
        className={ROW}
      >
        <span className={ICON_TILE}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {labelFor(destination)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {destination.hint}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100" aria-hidden />
      </CommandItem>
    );
  };

  const renderHit = (hit: SearchHit) => {
    const isPerson = hit.kind === "mentor" || hit.kind === "faculty" || hit.kind === "student";

    const HitIcon =
      hit.kind === "faculty"
        ? FacultyIcon
        : hit.kind === "mentor"
        ? MentorIcon
        : hit.kind === "opportunity"
        ? Trophy
        : hit.kind === "community"
        ? GroupsIcon
        : hit.kind === "post"
        ? PostIcon
        : hit.kind === "blog_post"
        ? PenLine
        : BookOpen;

    return (
      <CommandItem
        key={hit.id}
        value={`${hit.kind}-${hit.id}-${hit.title}`}
        onSelect={() => {
          if (user && query.trim()) recordSearchHistory(query.trim(), hit.to);
          goTo(hit.to);
        }}
        className={ROW}
      >
        {isPerson ? (
          <Avatar className="h-8 w-8 shrink-0 border border-border">
            <AvatarImage src={hit.image ?? undefined} alt="" />
            <AvatarFallback className="text-xs font-medium">{getInitials(hit.title)}</AvatarFallback>
          </Avatar>
        ) : hit.image ? (
          <img src={hit.image} alt="" loading="lazy" decoding="async" className="h-8 w-8 shrink-0 rounded-lg border border-border object-cover" />
        ) : (
          <span className={ICON_TILE}>
            <HitIcon className="h-4 w-4" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">
              {hit.title}
            </span>
            <span className="shrink-0 rounded border border-border px-1.5 text-3xs font-medium capitalize text-muted-foreground">
              {hit.kind.replace("_", " ")}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100" aria-hidden />
      </CommandItem>
    );
  };

  const searching = query.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search Friendly Learning"
        className={cn(
          "flex h-9 select-none items-center gap-2 rounded-lg border border-border bg-background text-sm text-muted-foreground transition-colors duration-150",
          "hover:border-foreground/20 hover:text-foreground",
          "w-9 justify-center p-0 sm:w-44 sm:justify-start sm:px-2.5 md:w-48 lg:w-56",
        )}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden truncate sm:inline">Search</span>
        <kbd className="ml-auto hidden shrink-0 items-center rounded border border-border bg-muted px-1.5 font-sans text-3xs font-medium text-muted-foreground sm:inline-flex">
          {isMac ? "\u2318" : "Ctrl"} D
        </kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery("");
            setIsAiMode(false);
          }
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>("[cmdk-input]");
              input?.focus();
            }, 10);
          }}
          className={cn(
            "top-[8%] max-h-[85vh] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10%] sm:max-w-xl",
            "rounded-xl border border-border bg-popover shadow-float",
            "[&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5 [&>button:last-child]:rounded-lg [&>button:last-child]:p-1.5 [&>button:last-child]:text-muted-foreground/70 hover:[&>button:last-child]:text-foreground hover:[&>button:last-child]:bg-accent transition-colors",
          )}
        >
          <DialogTitle className="sr-only">Search Friendly Learning</DialogTitle>
          <DialogDescription className="sr-only">
            Search mentors, faculty, hackathons, groups, posts and pages, or ask CampusBrain a question.
          </DialogDescription>

          <Command shouldFilter={false} className="rounded-none bg-transparent">
            <div className="border-b border-border p-3 pr-11 sm:p-4 sm:pr-12">
              <div
                className={cn(
                  "relative flex items-center rounded-lg border bg-background px-3 transition-colors duration-150",
                  isAiMode
                    ? "border-primary/50 ring-2 ring-primary/15"
                    : "border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
                )}
                cmdk-input-wrapper=""
              >
                {isAiMode ? (
                  <CampusBrainIcon animate={false} className="pointer-events-none mr-2.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Search className="pointer-events-none mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    isAiMode
                      ? "Ask a question, e.g. Which faculty work on machine learning?"
                      : "Search mentors, faculty, hackathons, groups…"
                  }
                  className="h-11 min-w-0 flex-1 border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus:outline-none focus:ring-0 md:text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && !e.shiftKey) {
                      e.preventDefault();
                      setIsAiMode((prev) => !prev);
                    } else if (e.key === "Enter") {
                      const highlighted = document.querySelector("[cmdk-item][aria-selected='true']");
                      if (!highlighted && query.trim()) {
                        e.preventDefault();
                        goToSearch();
                      }
                    }
                  }}
                />
                {liveLoading && (
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />
                )}
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="mr-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Clear query"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* A toggle, not a mode banner: aria-pressed carries the state */}
                <button
                  type="button"
                  onClick={() => setIsAiMode((prev) => !prev)}
                  aria-pressed={isAiMode}
                  className={cn(
                    "flex h-7 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors duration-150",
                    isAiMode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                  title="Ask CampusBrain (Tab)"
                >
                  <CampusBrainIcon animate={false} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ask</span>
                </button>
              </div>
            </div>

            {/* Quick Category Filter Bar */}
            {!searching && (
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <span className="mr-1 shrink-0 text-2xs font-medium text-muted-foreground">Go to</span>
                {CATEGORY_PILLS.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => goTo(cat.to)}
                      className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors duration-150 hover:border-foreground/20 hover:text-foreground"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* CommandList with custom scrollbar */}
            <CommandList
              className={cn(
                "max-h-[min(65vh,28rem)] p-2",
                "[&::-webkit-scrollbar]:w-1.5",
                "[&::-webkit-scrollbar-track]:bg-transparent",
                "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20",
                "[&::-webkit-scrollbar-thumb]:rounded-full",
                "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
              )}
            >
              {/* Streamlined Empty State with Suggested Searches */}
              {!searching && (
                <div className="p-1 space-y-3">
                  {history.length > 0 && (
                    <CommandGroup
                      heading={
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Recent searches</span>
                          <button
                            type="button"
                            onClick={clearHistory}
                            className="cursor-pointer text-xs font-normal text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      }
                    >
                      {history.map((entry) => (
                        <CommandItem
                          key={`history-${entry.query}`}
                          value={`history-${entry.query}`}
                          onSelect={() => runHistoryEntry(entry)}
                          className={ROW}
                        >
                          <span className={ICON_TILE}>
                            <HistoryIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {entry.query}
                          </span>
                          {/* Always visible: a hover-only control does not exist on touch screens */}
                          <button
                            type="button"
                            onClick={(e) => removeHistoryEntry(entry.query, e)}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            aria-label={`Remove ${entry.query} from history`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {trending.length > 0 && (
                    <CommandGroup
                      heading={
                        <span className="text-xs font-medium text-muted-foreground">Trending on campus</span>
                      }
                    >
                      {trending.map((entry) => (
                        <CommandItem
                          key={`trending-${entry.query}`}
                          value={`trending-${entry.query}`}
                          onSelect={() => {
                            if (user) recordSearchHistory(entry.query);
                            close();
                            navigate(buildSearchUrl(entry.query, "all"));
                          }}
                          className={ROW}
                        >
                          <span className={ICON_TILE}>
                            <TrendingUp className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {entry.query}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  <CommandGroup
                    heading={
                      <span className="text-xs font-medium text-muted-foreground">Suggested searches</span>
                    }
                  >
                    {SEARCH_SUGGESTIONS.map((item, idx) => {
                      const Icon =
                        item.category === "faculty"
                          ? FacultyIcon
                          : item.category === "mentors"
                          ? MentorIcon
                          : item.category === "opportunities"
                          ? Trophy
                          : item.category === "communities"
                          ? GroupsIcon
                          : BookOpen;

                      return (
                        <CommandItem
                          key={idx}
                          value={`suggested-search-${idx}-${item.query}`}
                          onSelect={() => {
                            setQuery(item.query);
                            if (user) recordSearchHistory(item.query);
                            close();
                            navigate(buildSearchUrl(item.query, "all"));
                          }}
                          className={ROW}
                        >
                          <span className={ICON_TILE}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {item.label}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100" aria-hidden />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>

                  {/* Compact Quick Actions */}
                  <CommandGroup heading="Quick actions">
                    <div className="grid grid-cols-2 gap-1.5 px-1 py-0.5">
                      <CommandItem
                        value="action-theme-toggle"
                        onSelect={() => setThemeState(toggleTheme())}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-2 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
                      >
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        <span className="truncate">{theme === "dark" ? "Light theme" : "Dark theme"}</span>
                      </CommandItem>
                      <CommandItem
                        value="action-how-it-works"
                        onSelect={() => goTo("/how-it-works")}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border p-2 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span className="truncate">How it works</span>
                      </CommandItem>
                    </div>
                  </CommandGroup>
                </div>
              )}

              {/* Active Search Top Result */}
              {searching && (
                <CommandGroup heading={isAiMode ? "Ask CampusBrain" : "Full search"}>
                  <CommandItem
                    value="search-platform-action"
                    onSelect={goToSearch}
                    className={cn(ROW, "py-2.5")}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      {isAiMode ? <CampusBrainIcon animate={false} className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-foreground">
                        {isAiMode ? "Ask CampusBrain " : "See all results for "}
                        <span className="break-all font-semibold">&ldquo;{query.trim()}&rdquo;</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {isAiMode
                          ? "An answer with cited sources from mentors, faculty and posts"
                          : "Results across every category"}
                      </span>
                    </span>
                    <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 font-sans text-3xs text-muted-foreground sm:inline">Enter</kbd>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Live matching rows */}
              {searching && liveResults.mentors.length > 0 && (
                <CommandGroup heading="Mentors">
                  {liveResults.mentors.map(renderHit)}
                </CommandGroup>
              )}

              {searching && liveResults.faculty.length > 0 && (
                <CommandGroup heading="Faculty">
                  {liveResults.faculty.map(renderHit)}
                </CommandGroup>
              )}

              {searching && liveResults.opportunities.length > 0 && (
                <CommandGroup heading="Hackathons & Contests">
                  {liveResults.opportunities.map(renderHit)}
                </CommandGroup>
              )}

              {searching && liveResults.communities.length > 0 && (
                <CommandGroup heading="Groups">
                  {liveResults.communities.map(renderHit)}
                </CommandGroup>
              )}

              {searching && liveResults.posts.length > 0 && (
                <CommandGroup heading="Posts">
                  {liveResults.posts.map(renderHit)}
                </CommandGroup>
              )}

              {searching && liveResults.related.length > 0 && (
                <CommandGroup heading="Related matches">
                  {liveResults.related.map(renderHit)}
                </CommandGroup>
              )}

              {searching && ranked.length > 0 && (
                <CommandGroup heading="Pages">
                  {ranked.map((entry) => renderDestination(entry.destination))}
                </CommandGroup>
              )}
            </CommandList>

            {/* Keyboard shortcut footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5 text-2xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-3xs font-medium">↑</kbd>
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-3xs font-medium">↓</kbd>
                  <span className="ml-0.5">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-3xs font-medium">↵</kbd>
                  <span className="ml-0.5">Select</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAiMode((prev) => !prev)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                >
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-3xs font-medium">Tab</kbd>
                  <span className="ml-0.5">{isAiMode ? "Search" : "Ask"}</span>
                </button>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-sans text-3xs font-medium">Esc</kbd>
                  <span className="ml-0.5">Close</span>
                </span>
              </div>
              {searching ? (
                <button
                  type="button"
                  onClick={goToSearch}
                  className="hidden items-center gap-1 text-2xs font-medium text-primary underline-offset-2 hover:underline sm:flex"
                >
                  See all results
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              ) : null}
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SiteSearch;
