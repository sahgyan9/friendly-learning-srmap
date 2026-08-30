/**
 * Which sections this person actually opens, so the mobile dock can put them
 * in its rotating slots.
 *
 * Deliberately localStorage and not a column on `profiles`. The dock has to
 * decide its layout during the first render, before any query could come back,
 * and a dock that reshuffles a second after it appears is worse than one that
 * is slightly wrong. Per-device is also the honest scope: this records how a
 * phone gets used, and that is where the dock lives.
 */

const STORAGE_KEY = "fl:nav-usage:v1";

/** Keeps a heavy user's score from growing without bound and pinning a section forever. */
const MAX_COUNT = 200;

interface UsageEntry {
  count: number;
  /** Epoch ms of the most recent visit; breaks ties between equal counts. */
  last: number;
}

type UsageMap = Record<string, UsageEntry>;

function read(): UsageMap {
  // Storage throws in private-mode Safari and is absent during prerender, and
  // whatever is in there was written by an older version of this app as often
  // as not. A ranking is a nicety; nothing here is worth breaking a render.
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as UsageMap;
  } catch {
    return {};
  }
}

function write(usage: UsageMap): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    /* Quota or private mode — the ranking simply stays where it was. */
  }
}

/** Records one visit to `url`. Safe to call on every route change. */
export function recordNavVisit(url: string): void {
  const usage = read();
  const entry = usage[url];
  usage[url] = {
    count: Math.min((entry?.count ?? 0) + 1, MAX_COUNT),
    last: Date.now(),
  };
  write(usage);
}

/**
 * Orders `urls` by how much this device uses each one, most-used first.
 *
 * Anything never visited keeps its position from the passed-in order, which is
 * what makes a fresh install come out as the hand-picked default rather than
 * as an arbitrary shuffle.
 */
export function rankNavSections(urls: string[]): string[] {
  const usage = read();
  return urls
    .map((url, index) => ({ url, index, entry: usage[url] }))
    .sort((a, b) => {
      const countDiff = (b.entry?.count ?? 0) - (a.entry?.count ?? 0);
      if (countDiff !== 0) return countDiff;
      const lastDiff = (b.entry?.last ?? 0) - (a.entry?.last ?? 0);
      if (lastDiff !== 0) return lastDiff;
      return a.index - b.index;
    })
    .map((item) => item.url);
}

/** Test/QA seam — also what a "reset my layout" control would call. */
export function clearNavUsage(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do; the caller cannot act on this either. */
  }
}
