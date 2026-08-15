/**
 * Shared helpers for the /search results page.
 *
 * All search filter state lives in the URL — these utilities are the single
 * source of truth for parameter names, tab ordering, and URL construction.
 * Neither the overlay (SiteSearch) nor the results page should hard-code
 * the string "q" or "type" anywhere else.
 */

export type SearchTab =
  | "all"
  | "mentors"
  | "faculty"
  | "opportunities"
  | "communities"
  | "posts"
  | "blog";

export const SEARCH_TABS: SearchTab[] = [
  "all",
  "mentors",
  "faculty",
  "opportunities",
  "communities",
  "posts",
  "blog",
];

export const TAB_LABELS: Record<SearchTab, string> = {
  all: "All",
  mentors: "Mentors",
  faculty: "Faculty",
  opportunities: "Hackathons",
  communities: "Groups",
  posts: "Posts",
  blog: "Blog",
};

/** Parse the two meaningful query params out of a URLSearchParams instance. */
export function parseSearchParams(params: URLSearchParams): {
  q: string;
  tab: SearchTab;
} {
  const q = params.get("q")?.trim() ?? "";
  const raw = params.get("type") ?? "all";
  const tab: SearchTab = (SEARCH_TABS as string[]).includes(raw)
    ? (raw as SearchTab)
    : "all";
  return { q, tab };
}

/** Build a /search URL string from parts. */
export function buildSearchUrl(q: string, tab: SearchTab = "all"): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (tab !== "all") params.set("type", tab);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
