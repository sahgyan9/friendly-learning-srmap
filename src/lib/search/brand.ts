/**
 * How the search presents itself, in one place.
 *
 * These used to live inside SiteSearch because the dialog header was the only
 * thing that said the name out loud. That was the problem: nobody knew the
 * search was worth using until *after* they had already decided to open it. The
 * hero now says it too, so the strings are shared.
 *
 * The ™ is the unregistered form and needs no filing to use. Note that the
 * descriptive line below it is deliberately *not* part of the mark — a phrase
 * that only praises and describes the goods is the kind of thing trade mark
 * registries refuse, so the coined word carries the claim and the sentence
 * explains it.
 */
export const SEARCH_BRAND = "Friendly Learning";
export const SEARCH_TAGLINE = "Search mentors, faculty, groups & posts";

/**
 * The questions the hero cycles through, and the placeholder inside the dialog.
 *
 * Every one of these is a question a plain keyword box would answer badly and
 * this one answers well — they are all phrases, none of them is a name, and
 * each targets a different kind of row (mentor, faculty, group, opportunity,
 * post). That is the whole pitch, and showing it beats explaining it: "Ask
 * anything" tells you the box accepts a question but not that asking one is
 * worth your time.
 *
 * Keep them short. The hero truncates at one line, and a question that wraps
 * or clips mid-word reads as a bug rather than as an example.
 */
export const EXAMPLE_QUESTIONS = [
  "Who can help with my ML project?",
  "Which professor is best for Data Structures?",
  "Any groups working on robotics?",
  "Seniors who've cracked an internship",
  "What's worth entering this month?",
] as const;

/** How long each example stays up, in ms. */
export const EXAMPLE_ROTATION_MS = 3200;
