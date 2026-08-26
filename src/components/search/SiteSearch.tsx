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
  Sparkles,
  History as HistoryIcon,
  Flame,
} from "lucide-react";

import { CampusMindIcon } from "@/components/icons/CampusMindIcon";
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
 * Color themes for suggestion destination icons.
 */
const DESTINATION_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  mentors: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20 dark:border-violet-500/30",
  },
  faculty: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20 dark:border-rose-500/30",
  },
  opportunities: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
  posts: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
  communities: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 dark:border-emerald-500/30",
  },
  events: {
    bg: "bg-pink-500/10 dark:bg-pink-500/20",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20 dark:border-pink-500/30",
  },
  "hackathon-partners": {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
  "study-partners": {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20 dark:border-blue-500/30",
  },
  "become-mentor": {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20 dark:border-indigo-500/30",
  },
  guides: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20 dark:border-cyan-500/30",
  },
  "how-it-works": {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20 dark:border-cyan-500/30",
  },
  contact: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20 dark:border-orange-500/30",
  },
  "toggle-theme": {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20 dark:border-purple-500/30",
  },
  messages: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20 dark:border-sky-500/30",
  },
  profile: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20 dark:border-blue-500/30",
  },
};

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
    const themeStyle = DESTINATION_THEMES[destination.id] || {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
    };

    return (
      <CommandItem
        key={destination.id}
        value={destination.id}
        onSelect={() => runDestination(destination)}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 my-0.5 transition-all duration-200 cursor-pointer",
          "data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-sm data-[selected=true]:scale-[1.008]",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 group-data-[selected=true]:scale-110 group-data-[selected=true]:shadow-xs",
            themeStyle.bg,
            themeStyle.text,
            themeStyle.border,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-sm text-foreground/90 group-data-[selected=true]:text-foreground group-data-[selected=true]:font-semibold">
            {labelFor(destination)}
          </span>
          <span className="block truncate text-xs text-muted-foreground/80 group-data-[selected=true]:text-muted-foreground">
            {destination.hint}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0.5 transition-all duration-200" />
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
        : BookOpen;

    const iconStyle =
      hit.kind === "faculty"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : hit.kind === "mentor"
        ? "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400"
        : hit.kind === "opportunity"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : hit.kind === "community"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : hit.kind === "post"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400";

    return (
      <CommandItem
        key={hit.id}
        value={`${hit.kind}-${hit.id}-${hit.title}`}
        onSelect={() => {
          if (user && query.trim()) recordSearchHistory(query.trim(), hit.to);
          goTo(hit.to);
        }}
        className={cn(
          "group flex items-center gap-3 rounded-xl px-3 py-2 my-0.5 transition-all duration-150 cursor-pointer",
          "data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-xs",
        )}
      >
        {isPerson ? (
          <Avatar className="h-8 w-8 shrink-0 border border-border/50">
            <AvatarImage src={hit.image ?? undefined} alt="" />
            <AvatarFallback className="text-xs font-medium">{getInitials(hit.title)}</AvatarFallback>
          </Avatar>
        ) : hit.image ? (
          <img src={hit.image} alt="" loading="lazy" decoding="async" className="h-8 w-8 shrink-0 rounded-lg object-cover border border-border/50" />
        ) : (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", iconStyle)}>
            <HitIcon className="h-3.5 w-3.5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-sm text-foreground/90 group-data-[selected=true]:text-foreground">
              {hit.title}
            </span>
            <span className="shrink-0 rounded bg-muted/60 px-1.5 py-0.2 text-4xs font-semibold uppercase text-muted-foreground">
              {hit.kind}
            </span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 opacity-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0.5 transition-all duration-150" />
      </CommandItem>
    );
  };

  const searching = query.trim().length > 0;

  return (
    <>
      <div className="group relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-0.5 rounded-xl bg-primary/20 opacity-0 blur-xs transition-opacity duration-300 group-hover:opacity-75"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search CampusMind"
          className={cn(
            "relative flex h-9 items-center gap-2 rounded-xl border border-primary/25 bg-background text-xs font-normal text-muted-foreground transition-all duration-200 shadow-xs select-none",
            "hover:border-primary/45 hover:bg-muted/30 hover:text-foreground",
            "w-9 justify-center p-0 sm:w-44 sm:justify-start sm:px-2 md:w-48 lg:w-52",
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs shadow-primary/25">
            <Search className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="hidden sm:inline truncate text-xs text-muted-foreground group-hover:text-foreground">
            Ask CampusMind…
          </span>
          <span className="ml-auto hidden sm:flex shrink-0 items-center rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-3xs font-semibold text-primary shadow-2xs">
            <span className="hidden md:inline">AI Mode</span>
            <span className="md:hidden">AI</span>
          </span>
        </button>
      </div>

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
            "border border-white/10 dark:border-white/15 bg-card/95 dark:bg-[#0c1017]/95 backdrop-blur-2xl shadow-2xl rounded-2xl",
            "[&>button:last-child]:top-3.5 [&>button:last-child]:right-3.5 [&>button:last-child]:rounded-lg [&>button:last-child]:p-1.5 [&>button:last-child]:text-muted-foreground/70 hover:[&>button:last-child]:text-foreground hover:[&>button:last-child]:bg-accent transition-colors",
          )}
        >
          <DialogTitle className="sr-only">Search Friendly Learning</DialogTitle>
          <DialogDescription className="sr-only">
            Search for mentors, faculty, hackathons, groups, posts and pages with CampusMind AI.
          </DialogDescription>

          <Command shouldFilter={false} className="rounded-none bg-transparent">
            {/* Input section with rounded rectangle container & border glow */}
            <div className="p-3 pr-11 sm:p-4 sm:pr-12 pb-3 border-b border-border/30 bg-muted/10">
              <div
                className={cn(
                  "relative flex items-center rounded-xl px-3 py-1 transition-all duration-300",
                  "border bg-background/80 dark:bg-[#111722]/80 backdrop-blur-md shadow-xs",
                  isAiMode
                    ? "border-violet-500/50 bg-gradient-to-r from-violet-500/[0.08] via-purple-500/[0.04] to-transparent ring-2 ring-violet-500/20 shadow-md shadow-violet-500/10"
                    : "border-border/60 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-background",
                )}
                cmdk-input-wrapper=""
              >
                {isAiMode ? (
                  <CampusMindIcon speed={liveLoading ? "fast" : "normal"} className="mr-2.5 h-5 w-5 text-violet-500 dark:text-violet-400 shrink-0 pointer-events-none" />
                ) : (
                  <Search className="mr-2.5 h-4 w-4 text-muted-foreground/70 shrink-0 pointer-events-none" />
                )}
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    isAiMode
                      ? 'Ask CampusMind: "Computer Science faculty" or "Web Dev mentors…"'
                      : "Search mentors, faculty, hackathons, groups…"
                  }
                  className="h-10 sm:h-11 flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/50 border-none outline-none focus:outline-none focus:ring-0"
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
                {liveLoading && <CampusMindIcon speed="fast" className="mr-2 h-4 w-4 text-violet-500 dark:text-violet-400 shrink-0" />}
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="shrink-0 p-1 mr-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
                    title="Clear query"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* In-box AI Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsAiMode((prev) => !prev)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-pointer select-none",
                    isAiMode
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-500/25 ring-1 ring-violet-400/40"
                      : "border border-border/60 bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border",
                  )}
                  title="Toggle AI Mode (Press Tab)"
                >
                  <CampusMindIcon className={cn("h-3.5 w-3.5", isAiMode ? "text-violet-200" : "text-violet-500")} />
                  <span className="hidden sm:inline">{isAiMode ? "AI Active" : "AI Mode"}</span>
                </button>
              </div>
            </div>

            {/* Quick Category Filter Bar */}
            {!searching && (
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/30 bg-muted/10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-2xs font-medium text-muted-foreground/70 shrink-0 mr-1">Jump to:</span>
                {CATEGORY_PILLS.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => goTo(cat.to)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 hover:bg-accent hover:border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-all duration-150 shadow-2xs"
                    >
                      <Icon className="h-3 w-3 text-muted-foreground" />
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
                          <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground/90">
                            <HistoryIcon className="h-3.5 w-3.5 text-primary" />
                            Recent Searches
                          </span>
                          <button
                            type="button"
                            onClick={clearHistory}
                            className="text-3xs text-muted-foreground font-normal hover:text-foreground transition-colors cursor-pointer"
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
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2 my-0.5 transition-all duration-150 cursor-pointer",
                            "data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-xs hover:bg-accent/50",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground">
                            <HistoryIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground/90 group-data-[selected=true]:text-foreground">
                            {entry.query}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => removeHistoryEntry(entry.query, e)}
                            className="shrink-0 rounded-md p-1 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-accent transition-all"
                            title="Remove from history"
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
                        <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground/90">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          Trending Now
                        </span>
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
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2 my-0.5 transition-all duration-150 cursor-pointer",
                            "data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-xs hover:bg-accent/50",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-500">
                            <Flame className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground/90 group-data-[selected=true]:text-foreground">
                            {entry.query}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  <CommandGroup
                    heading={
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-semibold text-xs text-foreground/90">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Suggested Searches
                        </span>
                        <span className="text-3xs text-muted-foreground font-normal">Popular across SRM-AP</span>
                      </div>
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

                      const themeStyle =
                        DESTINATION_THEMES[item.category] || {
                          bg: "bg-primary/10",
                          text: "text-primary",
                          border: "border-primary/20",
                        };

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
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 my-1 transition-all duration-150 cursor-pointer",
                            "data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-xs hover:bg-accent/50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 group-data-[selected=true]:scale-105",
                              themeStyle.bg,
                              themeStyle.text,
                              themeStyle.border,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="block truncate font-medium text-sm text-foreground/90 group-data-[selected=true]:text-foreground">
                                {item.label}
                              </span>
                              <span className="hidden sm:inline-block shrink-0 rounded bg-muted/60 px-1.5 py-0.2 text-4xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {item.category === "guides" ? "Guide" : item.category}
                              </span>
                            </span>
                            <span className="block truncate text-xs text-muted-foreground/75 mt-0.5">
                              {item.subtitle}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 opacity-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0.5 transition-all" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>

                  {/* Compact Quick Actions */}
                  <CommandGroup heading="Quick Actions">
                    <div className="grid grid-cols-2 gap-1.5 px-1 py-0.5">
                      <CommandItem
                        value="action-theme-toggle"
                        onSelect={() => setThemeState(toggleTheme())}
                        className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/40 hover:bg-accent/60 p-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        {theme === "dark" ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
                        <span className="truncate">{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
                      </CommandItem>
                      <CommandItem
                        value="action-how-it-works"
                        onSelect={() => goTo("/how-it-works")}
                        className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/40 hover:bg-accent/60 p-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5 text-cyan-500" />
                        <span className="truncate">How it Works</span>
                      </CommandItem>
                    </div>
                  </CommandGroup>
                </div>
              )}

              {/* Active Search Top Result */}
              {searching && (
                <CommandGroup heading={isAiMode ? "CampusMind AI Search" : "Full Search"}>
                  <CommandItem
                    value="search-platform-action"
                    onSelect={goToSearch}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 my-1 transition-all duration-200 cursor-pointer",
                      isAiMode
                        ? "border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent data-[selected=true]:bg-violet-500/20 data-[selected=true]:border-violet-500/50"
                        : "data-[selected=true]:bg-accent/80 data-[selected=true]:shadow-sm data-[selected=true]:scale-[1.008]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        isAiMode
                          ? "border-violet-500/40 bg-violet-500/20 text-violet-500 dark:text-violet-300"
                          : "bg-primary/10 text-primary border-primary/20",
                      )}
                    >
                      {isAiMode ? <CampusMindIcon className="h-5 w-5" /> : <Search className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-sm text-foreground leading-snug">
                        {isAiMode ? "Ask CampusMind: " : "See all results for "}
                        "<span className={isAiMode ? "text-violet-500 dark:text-violet-400 break-all font-bold" : "text-primary break-all"}>{query.trim()}</span>"
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {isAiMode
                          ? "Press Enter to generate AI summary, ratings synthesis & match insights"
                          : "Press Enter to view complete results across all categories"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0.5 transition-all duration-200" />
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
                <CommandGroup heading="Closest Matches (AI)">
                  {liveResults.related.map(renderHit)}
                </CommandGroup>
              )}

              {searching && ranked.length > 0 && (
                <CommandGroup heading="Pages & Quick Links">
                  {ranked.map((entry) => renderDestination(entry.destination))}
                </CommandGroup>
              )}
            </CommandList>

            {/* Keyboard shortcut footer */}
            <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-2.5 text-2xs text-muted-foreground/80">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-3xs font-medium border border-border/60 shadow-2xs">↑</kbd>
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-3xs font-medium border border-border/60 shadow-2xs">↓</kbd>
                  <span className="ml-0.5">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-3xs font-medium border border-border/60 shadow-2xs">↵</kbd>
                  <span className="ml-0.5">Select</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAiMode((prev) => !prev)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                >
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-3xs font-medium border border-border/60 shadow-2xs">Tab</kbd>
                  <span className="ml-0.5">{isAiMode ? "Standard" : "AI Mode"}</span>
                </button>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-3xs font-medium border border-border/60 shadow-2xs">Esc</kbd>
                  <span className="ml-0.5">Close</span>
                </span>
              </div>
              {searching ? (
                <button
                  onClick={goToSearch}
                  className="hidden sm:flex items-center gap-1 text-3xs text-primary/70 hover:text-primary transition-colors group"
                >
                  <span>See all results</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 text-3xs text-muted-foreground/60">
                  <CampusMindIcon className="h-3.5 w-3.5 text-violet-500" />
                  <span className="font-semibold text-foreground/80">CampusMind</span> AI
                </div>
              )}
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SiteSearch;
