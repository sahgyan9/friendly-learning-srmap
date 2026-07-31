import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { BLOG_POSTS } from "@/data/blog-posts";
import { normalise } from "@/lib/search/rank";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  image?: string | null;
}

export interface SiteSearchResults {
  mentors: SearchHit[];
  faculty: SearchHit[];
  posts: SearchHit[];
  articles: SearchHit[];
}

const EMPTY: SiteSearchResults = { mentors: [], faculty: [], posts: [], articles: [] };

/** Below this, a query matches so much that the results are noise. */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 220;
const PER_GROUP = 4;

/** Blog posts ship with the app, so they are matched here rather than fetched. */
function searchArticles(query: string): SearchHit[] {
  const term = normalise(query);

  return BLOG_POSTS.filter((post) => {
    const haystack = normalise(`${post.title} ${post.excerpt} ${post.tags.join(" ")}`);
    return haystack.includes(term);
  })
    .slice(0, PER_GROUP)
    .map((post) => ({
      id: post.slug,
      title: post.title,
      subtitle: `${post.readingMinutes} min read · ${post.tags.slice(0, 2).join(", ")}`,
      to: `/blog/${post.slug}`,
    }));
}

/**
 * Live results for the site search: mentors, lecturers, board posts, articles.
 *
 * All four run in parallel on every keystroke-after-debounce. A stale response
 * is dropped rather than rendered — without the sequence check, a slow query
 * for "an" can land after a fast one for "anjali" and replace the results the
 * person is actually looking at.
 */
export function useSiteSearch(query: string, enabled: boolean) {
  const [results, setResults] = useState<SiteSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      sequence.current += 1; // cancels anything in flight
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    const run = ++sequence.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      const [mentorResult, facultyResult, postResult] = await Promise.all([
        searchMentors(trimmed).catch(() => ({ data: null, error: true })),
        getFacultyList({ search: trimmed, limit: PER_GROUP, sort: "rating" }).catch(() => ({
          data: [],
        })),
        getCommunityPosts({ search: trimmed, limit: PER_GROUP }).catch(() => ({ data: null })),
      ]);

      if (run !== sequence.current) return;

      const mentors: SearchHit[] = (mentorResult.data ?? []).slice(0, PER_GROUP).map((mentor) => ({
        id: mentor.id,
        title: mentor.name ?? "Mentor",
        subtitle: [mentor.department, (mentor.skills ?? []).slice(0, 3).join(", ")]
          .filter(Boolean)
          .join(" · "),
        to: `/mentor/${mentor.id}`,
        image: mentor.profile_image,
      }));

      const faculty: SearchHit[] = (facultyResult.data ?? []).map((person) => ({
        id: person.id,
        title: person.name,
        subtitle: [person.designation, person.department].filter(Boolean).join(" · "),
        to: `/faculty/${person.slug}`,
        image: person.image_url,
      }));

      const posts: SearchHit[] = (postResult.data ?? []).map((post) => ({
        id: post.id,
        title: post.title,
        subtitle: `${post.author.name} · ${post.comments_count} ${
          post.comments_count === 1 ? "reply" : "replies"
        }`,
        to: `/community-posts/${post.id}`,
      }));

      setResults({ mentors, faculty, posts, articles: searchArticles(trimmed) });
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  const isEmpty =
    results.mentors.length === 0 &&
    results.faculty.length === 0 &&
    results.posts.length === 0 &&
    results.articles.length === 0;

  return { results, loading, isEmpty };
}
