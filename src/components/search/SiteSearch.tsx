import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Moon, Search, Sun } from "lucide-react";

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
import { useSiteSearch, type SearchHit } from "@/hooks/useSiteSearch";
import {
  DEFAULT_SUGGESTION_IDS,
  DESTINATIONS,
  isVisibleTo,
  type SearchDestination,
} from "@/lib/search/destinations";
import { rankDestinations } from "@/lib/search/rank";
import { getInitials } from "@/utils/user-utils";
import { getTheme, toggleTheme, type Theme } from "@/lib/theme";
import { OPEN_NOTIFICATIONS_EVENT } from "@/lib/search/events";
import { cn } from "@/lib/utils";

/**
 * The site's search bar: one field for pages, people, posts and settings.
 *
 * It exists because the navbar can hold six links and the site has about twenty
 * destinations. Everything past those six — faculty ratings, the blog, study
 * partners, the certificate — was effectively invisible unless you already knew
 * it was there.
 *
 * Matching is alias-first rather than literal. A fresher looking for help types
 * "senior", someone with a broken page types "bug"; both have to land somewhere
 * useful, which is what the keyword lists in destinations.ts are for.
 */
const SiteSearch = () => {
  const navigate = useNavigate();
  const { user, isMentor, isAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isMac, setIsMac] = useState(false);

  // Read on the client only: this header is server-rendered, and both of these
  // read from the DOM and the user agent.
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (open) setThemeState(getTheme());
  }, [open]);

  // Ctrl/⌘ D. preventDefault is not optional here — the browser's own binding on
  // this combination is "bookmark this page", and without it every attempt at
  // search would also drop a bookmark. It runs before the toggle so a stray
  // re-render or an early return can never leave the default in place.
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
          // Left open on purpose: flipping the theme is the sort of thing people
          // do twice to compare, and reopening the palette each time is a chore.
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

    return (
      <CommandItem
        key={destination.id}
        value={destination.id}
        onSelect={() => runDestination(destination)}
        className="gap-3"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{labelFor(destination)}</span>
          <span className="block truncate text-xs text-muted-foreground">{destination.hint}</span>
        </span>
      </CommandItem>
    );
  };

  const renderHit = (hit: SearchHit, withAvatar: boolean) => (
    <CommandItem key={hit.id} value={hit.id} onSelect={() => goTo(hit.to)} className="gap-3">
      {withAvatar ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={hit.image ?? undefined} alt="" />
          <AvatarFallback className="text-xs">{getInitials(hit.title)}</AvatarFallback>
        </Avatar>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Search className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium">{hit.title}</span>
        {hit.subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
        )}
      </span>
    </CommandItem>
  );

  const searching = query.trim().length > 0;
  const nothingAtAll = searching && !loading && ranked.length === 0 && isEmpty;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className={cn(
          "h-9 gap-2 px-2.5 text-muted-foreground",
          // The field used to shrink back to a bare icon between lg and xl,
          // because the nav links shared the row and the three together
          // overflowed 1024px. The links moved to their own row underneath, so
          // the width can now just grow with the viewport.
          "w-9 justify-center",
          "md:w-56 md:justify-start md:px-3",
          "lg:w-72",
          "xl:w-80",
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">Search</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium md:inline-flex">
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
        {/* Anchored near the top rather than centred. A centred palette moves
            up and down as results appear and disappear, so the row under the
            cursor shifts while you are still typing. */}
        <DialogContent className="top-[8%] max-h-[84vh] translate-y-0 gap-0 overflow-hidden p-0 sm:top-[10%] sm:max-w-xl">
          <DialogTitle className="sr-only">Search Friendly Learning</DialogTitle>
          <DialogDescription className="sr-only">
            Search for pages, mentors, lecturers, posts and settings.
          </DialogDescription>

          {/* Filtering is done by rank.ts and by the server, not by cmdk — see
              the note in rank.ts for why running both would lose results. */}
          <Command shouldFilter={false} className="rounded-none">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages, mentors, lecturers, posts…"
            />

            <CommandList className="max-h-[min(70vh,28rem)]">
              {nothingAtAll && (
                <CommandEmpty>
                  <p className="font-medium">Nothing matched “{query.trim()}”</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a person's name, a department, or a word like “hackathon” or “bug”.
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
                  {results.mentors.map((hit) => renderHit(hit, true))}
                </CommandGroup>
              )}

              {results.faculty.length > 0 && (
                <CommandGroup heading="Faculty">
                  {results.faculty.map((hit) => renderHit(hit, true))}
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

              {searching && loading && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching people and posts…
                </div>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SiteSearch;
