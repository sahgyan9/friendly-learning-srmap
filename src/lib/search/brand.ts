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

export interface SearchSuggestion {
  query: string;
  category: "faculty" | "mentors" | "opportunities" | "communities" | "guides";
  label: string;
  subtitle: string;
}

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  {
    query: "Computer Science & Machine Learning faculty",
    category: "faculty",
    label: "Computer Science & Machine Learning faculty",
    subtitle: "Explore 600+ professors, departments & research areas",
  },
  {
    query: "Senior mentors for Web Development & DSA",
    category: "mentors",
    label: "Senior mentors for Web Development & DSA",
    subtitle: "Connect with 3rd & 4th year seniors for project guidance",
  },
  {
    query: "Smart India Hackathon & tech competitions",
    category: "opportunities",
    label: "Smart India Hackathon & tech competitions",
    subtitle: "Browse active contests, team criteria & registration dates",
  },
  {
    query: "Student project groups & tech communities",
    category: "communities",
    label: "Student project groups & tech communities",
    subtitle: "Find peers for hackathons, research labs & club builds",
  },
  {
    query: "Guides for electives & academic help",
    category: "guides",
    label: "Guides for electives & academic help",
    subtitle: "Read campus tips on courses, credits & navigating SRM-AP",
  },
];

export const EXAMPLE_QUESTIONS = SEARCH_SUGGESTIONS.map((s) => s.query);

/** How long each example stays up, in ms. */
export const EXAMPLE_ROTATION_MS = 3200;

