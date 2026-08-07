import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  ChevronRight,
  GraduationCap,
  Loader2,
  MessageSquare,
  Moon,
  Newspaper,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useSiteSearch, type SearchHit, type SearchHitKind } from "@/hooks/useSiteSearch";
import {
  DEFAULT_SUGGESTION_IDS,
  DESTINATIONS,
  isVisibleTo,
  type SearchDestination,
} from "@/lib/search/destinations";
import { rankDestinations } from "@/lib/search/rank";
import { getInitials } from "@/utils/user-utils";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { OPEN_NOTIFICATIONS_EVENT, OPEN_SEARCH_EVENT } from "@/lib/search/events";
import { EXAMPLE_QUESTIONS, SEARCH_BRAND, SEARCH_TAGLINE } from "@/lib/search/brand";
import { cn } from "@/lib/utils";

/**
 * Per-kind icon and label, keyed by `SearchHit.kind`.
 */
const KIND_META: Record<
  SearchHitKind,
  { label: string; icon: LucideIcon; avatar: boolean; className: string }
> = {
  faculty: {
    label: "Faculty",
    icon: GraduationCap,
    avatar: true,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  mentor: {
    label: "Mentor",
    icon: UserRound,
    avatar: true,
    className: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  community: {
    label: "Group",
    icon: Users,
    avatar: false,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  post: {
    label: "Post",
    icon: MessageSquare,
    avatar: false,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  article: {
    label: "Blog",
    icon: Newspaper,
    avatar: false,
    className: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  opportunity: {
    label: "Opportunity",
    icon: Briefcase,
    avatar: false,
    className: "border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
};

/**
 * Color themes for suggestion destination icons to give a vibrant, premium look.
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

const SiteSearch = () => {
  const navigate = useNavigate();
  const { user, isMentor, isAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (open) setThemeState(getTheme());
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

  const { results, loading, isEmpty } = useSiteSearch(query, open);

  const ranked = useMemo(
    () => (query.trim() ? rankDestinations(available, query, 6) : []),
    [available, query],
  );

  const suggestions = useMemo(
    () =>
      DEFAULT_SUGGESTION_IDS.map((id) => available.find((entry) => entry.id === id)).filter(
        (entry): entry is SearchDestination => Boolean(entry),
      ),
    [available],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const runDestination = useCallback(
    (destination: SearchDestination) => {
      if (destination.to) {
        close();
        navigate(destination.to);
        return;
      }

      switch (destination.action) {
        case "toggle-theme":
          setThemeState(toggleTheme());
          return;
        case "open-notifications":
          close();
          window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATIONS_EVENT));
          return;
        default:
          close();
      }
    },
    [close, navigate],
  );

  const goTo = useCallback(
    (to: string) => {
      close();
      navigate(to);
    },
    [close, navigate],
  );

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
          <span className="block truncate font-medium text-base text-foreground/90 group-data-[selected=true]:text-foreground group-data-[selected=true]:font-semibold">
            {labelFor(destination)}
          </span>
          <span className="block truncate text-xs sm:text-sm text-muted-foreground/80 group-data-[selected=true]:text-muted-foreground">
            {destination.hint}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0.5 transition-all duration-200" />
      </CommandItem>
    );
  };

  const renderHit = (hit: SearchHit, showTag: boolean) => {
    const meta = KIND_META[hit.kind];
    const Icon = meta.icon;

    return (
      <CommandItem
        key={hit.id}
        value={hit.id}
        onSelect={() => goTo(hit.to)}
        className="group p-0 my-0.5 rounded-xl overflow-hidden data-[selected=true]:bg-accent/80 data-[selected=true]:scale-[1.008] transition-all duration-200"
      >
        <a
          href={hit.to}
          className="flex w-full items-center gap-3 px-3 py-2.5"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) {
              event.stopPropagation();
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            goTo(hit.to);
          }}
        >
          {meta.avatar ? (
            <Avatar className="h-9 w-9 shrink-0 border border-border/50 group-data-[selected=true]:border-primary/40 group-data-[selected=true]:scale-105 transition-all duration-200">
              <AvatarImage src={hit.image ?? undefined} alt="" />
              <AvatarFallback className="text-xs font-medium">{getInitials(hit.title)}</AvatarFallback>
            </Avatar>
          ) : (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border group-data-[selected=true]:scale-105 transition-all duration-200",
                meta.className,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium text-base text-foreground/90 group-data-[selected=true]:text-foreground group-data-[selected=true]:font-semibold">
                {hit.title}
              </span>
              {showTag && (
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    meta.className,
                  )}
                >
                  {meta.label}
                </span>
              )}
            </span>
            {hit.subtitle && (
              <span className="block truncate text-xs sm:text-sm text-muted-foreground/80 group-data-[selected=true]:text-muted-foreground">
                {hit.subtitle}
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 group-data-[selected=true]:opacity-100 group-data-[selected=true]:translate-x-0.5 transition-all duration-200" />
        </a>
      </CommandItem>
    );
  };

  const searching = query.trim().length > 0;
  const nothingAtAll = searching && !loading && ranked.length === 0 && isEmpty;
  const hasPeopleHits =
    results.mentors.length > 0 || results.faculty.length > 0 || results.related.length > 0;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className={cn(
          "group h-9 gap-2 border bg-gradient-to-r px-2.5 font-normal rounded-xl shadow-xs",
          "border-primary/25 from-[#3963C6]/10 via-violet-500/10 to-emerald-500/10",
          "text-foreground/70",
          "transition-all duration-300",
          "hover:border-primary/50 hover:from-[#3963C6]/20 hover:via-violet-500/20 hover:to-emerald-500/20 hover:text-foreground hover:shadow-sm",
          "w-9 justify-center",
          "md:w-56 md:justify-start md:px-3",
          "lg:w-72",
          "xl:w-80",
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary animate-pulse" />
        <span className="hidden md:inline">Ask anything…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-2xs md:inline-flex">
          {isMac ? "⌘" : "Ctrl"} D
        </kbd>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            // Automatically focus the search input so the user can start typing immediately
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
            Search for pages, mentors, lecturers, groups, posts and settings, or
            describe what you need in your own words.
          </DialogDescription>

          {/* Top accent glow line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 opacity-80" />

          {/* Custom Header Bar */}
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-muted/20 pr-12">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-indigo-500/20 to-purple-500/20 text-primary border border-primary/30 shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-violet-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  {SEARCH_BRAND}
                  <sup className="ml-0.5 text-xs font-bold text-violet-500 dark:text-violet-400">™</sup>
                </span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  {SEARCH_TAGLINE}
                </span>
              </div>
            </div>
          </div>

          <Command shouldFilter={false} className="rounded-none bg-transparent">
            {/* Input section with clear button */}
            <div className="relative flex items-center border-b border-border/40 px-3">
              <CommandInput
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder={EXAMPLE_QUESTIONS[0]}
                className="h-13 border-none bg-transparent focus:ring-0 text-base placeholder:text-muted-foreground/60"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
                  title="Clear query"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick sample prompt chips when empty */}
            {!searching && (
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/30 bg-muted/10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <span className="text-[11px] font-medium text-muted-foreground shrink-0 mr-1">Try:</span>
                {EXAMPLE_QUESTIONS.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(q)}
                    className="shrink-0 rounded-full border border-border/60 bg-background/60 hover:bg-accent px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-all duration-150 shadow-2xs"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            )}

            {hasPeopleHits && (
              <p className="border-b border-border/30 px-4 py-1.5 text-[11px] text-muted-foreground/80 bg-muted/10">
                {isMac ? "⌘" : "Ctrl"}-click a result to open it in a new tab and keep browsing here
              </p>
            )}

            {/* CommandList with custom thin scrollbar */}
            <CommandList className={cn(
              "max-h-[min(65vh,28rem)] p-2",
              "[&::-webkit-scrollbar]:w-1.5",
              "[&::-webkit-scrollbar-track]:bg-transparent",
              "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/20",
              "[&::-webkit-scrollbar-thumb]:rounded-full",
              "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
            )}>
              {nothingAtAll && (
                <CommandEmpty className="py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-3 border border-border/50">
                    <Sparkles className="h-6 w-6 opacity-40" />
                  </div>
                  <p className="font-semibold text-foreground">Nothing matched “{query.trim()}”</p>
                  <p className="mt-1.5 text-xs text-muted-foreground max-w-xs mx-auto">
                    Try describing what you need — “someone who knows machine learning”
                    works as well as a name.
                  </p>
                </CommandEmpty>
              )}

              {!searching && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map(renderDestination)}
                </CommandGroup>
              )}

              {searching && ranked.length > 0 && (
                <CommandGroup heading="Jump to">
                  {ranked.map((entry) => renderDestination(entry.destination))}
                </CommandGroup>
              )}

              {results.mentors.length > 0 && (
                <CommandGroup heading="Mentors">
                  {results.mentors.map((hit) => renderHit(hit, false))}
                </CommandGroup>
              )}

              {results.faculty.length > 0 && (
                <CommandGroup heading="Faculty">
                  {results.faculty.map((hit) => renderHit(hit, false))}
                </CommandGroup>
              )}

              {results.communities.length > 0 && (
                <CommandGroup heading="Groups">
                  {results.communities.map((hit) => renderHit(hit, false))}
                </CommandGroup>
              )}

              {results.posts.length > 0 && (
                <CommandGroup heading="Posts">
                  {results.posts.map((hit) => renderHit(hit, false))}
                </CommandGroup>
              )}

              {results.articles.length > 0 && (
                <CommandGroup heading="From the blog">
                  {results.articles.map((hit) => renderHit(hit, false))}
                </CommandGroup>
              )}

              {results.related.length > 0 && (
                <CommandGroup heading="Closest to what you asked">
                  {results.related.map((hit) => renderHit(hit, true))}
                </CommandGroup>
              )}

              {searching && loading && (
                <div className="flex items-center justify-center gap-2.5 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching people, groups and posts…
                </div>
              )}
            </CommandList>

            {/* Keyboard shortcut footer */}
            <div className="flex items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground/80">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium border border-border/60 shadow-2xs">↑</kbd>
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium border border-border/60 shadow-2xs">↓</kbd>
                  <span className="ml-0.5">Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium border border-border/60 shadow-2xs">↵</kbd>
                  <span className="ml-0.5">Select</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium border border-border/60 shadow-2xs">Esc</kbd>
                  <span className="ml-0.5">Close</span>
                </span>
              </div>
              <div className="hidden sm:block text-[10px] text-muted-foreground/60">
                <span className="font-semibold text-primary/80">CampusMind</span> Search
              </div>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SiteSearch;
