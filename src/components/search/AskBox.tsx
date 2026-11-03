import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { SEARCH_SUGGESTIONS } from "@/lib/search/brand";
import { OPEN_SEARCH_EVENT } from "@/lib/search/events";
import { buildSearchUrl } from "@/lib/search/search-params";
import { cn } from "@/lib/utils";

// Short forms of the shared suggestions: chips have to fit two to a row at 360px.
const EXAMPLE_CHIPS: { label: string; query: string }[] = [
  { label: "Machine learning faculty", query: SEARCH_SUGGESTIONS[0]?.query ?? "Machine learning faculty" },
  { label: "Web dev mentors", query: SEARCH_SUGGESTIONS[1]?.query ?? "Web development mentors" },
  { label: "Hackathons", query: SEARCH_SUGGESTIONS[2]?.query ?? "Hackathons" },
  { label: "Project groups", query: SEARCH_SUGGESTIONS[3]?.query ?? "Project groups" },
];

/**
 * The hero's front door to search.
 *
 * It is a button styled as a field on purpose: a real input here would need its
 * own results surface, and duplicating the result list in two places is how the
 * two drift apart. Clicking hands off to the header's search dialog, which
 * already does the work. It has to look like a field, though — that is the
 * signifier that says "type here", and a decorated pill did not.
 *
 * The example chips skip the dialog and go straight to results, because a
 * visitor who picks one has already told us the query.
 */
const AskBox = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const [isMac, setIsMac] = useState(false);

  // The homepage is pre-rendered, so the user agent is read on the client only.
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent));
  }, []);

  const open = () => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));

  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)}>
      <button
        type="button"
        onClick={open}
        aria-label="Search mentors, faculty, groups and posts"
        aria-haspopup="dialog"
        className="group flex h-14 w-full items-center gap-3 rounded-xl border border-border bg-card pl-4 pr-2 text-left shadow-card transition-colors duration-150 hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:pl-5"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-base text-muted-foreground">
          <span className="sm:hidden">Search or ask a question</span>
          <span className="hidden sm:inline">Search mentors, faculty, groups, or ask a question</span>
        </span>
        <kbd className="hidden shrink-0 items-center rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-2xs font-medium text-muted-foreground md:inline-flex">
          {isMac ? "⌘" : "Ctrl"} D
        </kbd>
        <span className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors duration-150 group-hover:bg-primary/90">
          Search
        </span>
      </button>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Try</span>
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => navigate(buildSearchUrl(chip.query, "all"))}
            className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-sm text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AskBox;
