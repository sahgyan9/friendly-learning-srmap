import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import {
  getCommunityKindMeta,
  listCommunities,
} from "@/integrations/supabase/services/communities";
import { askWhoCanHelp } from "@/integrations/supabase/services/ask";
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
  communities: SearchHit[];
  posts: SearchHit[];
  articles: SearchHit[];
  /** Meaning-matched, only when the literal pass found nothing. See below. */
  related: SearchHit[];
}

const EMPTY: SiteSearchResults = {
  mentors: [],
  faculty: [],
  communities: [],
  posts: [],
  articles: [],
  related: [],
};

/** Below this, a query matches so much that the results are noise. */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 220;
const PER_GROUP = 4;

/**
 * Gate for the semantic fallback.
 *
 * Every literal miss could be sent to the embedding search, but most misses are
 * half-typed names ("anj", "dr r") that the next keystroke fixes on its own, and
 * each uncached call spends one of a limited number of embedding requests per
 * minute. A phrase — two words with some length to them, or one long word — is
 * the cheapest signal that someone finished expressing a thought rather than
 * started spelling a name. "dr r" has a space and is deliberately excluded.
 */
function looksLikeAPhrase(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length >= 14 || (/\s/.test(trimmed) && trimmed.length >= 8);
}

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
      const [mentorResult, facultyResult, postResult, communityResult] = await Promise.all([
        searchMentors(trimmed).catch(() => ({ data: null, error: true })),
        getFacultyList({ search: trimmed, limit: PER_GROUP, sort: "rating" }).catch(() => ({
          data: [],
        })),
        getCommunityPosts({ search: trimmed, limit: PER_GROUP }).catch(() => ({ data: null })),
        listCommunities({ search: trimmed, limit: PER_GROUP }).catch(() => ({ data: [] })),
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

      const communities: SearchHit[] = (communityResult.data ?? []).map((community) => ({
        id: community.id,
        title: community.name,
        subtitle: `${getCommunityKindMeta(community.kind).label} · ${community.member_count} ${
          community.member_count === 1 ? "member" : "members"
        }`,
        to: `/communities/${community.slug}`,
      }));

      const articles = searchArticles(trimmed);
      setResults({ mentors, faculty, communities, posts, articles, related: [] });
      setLoading(false);

      // Second pass, meaning rather than spelling.
      //
      // Everything above is ILIKE: it can only find a row that literally
      // contains what was typed. So "someone who knows machine learning" misses
      // a professor listing "Deep Learning", and "coding contest" misses a
      // hackathon. That gap is why this box used to tell people to rephrase
      // ("try a word like hackathon") instead of just answering them.
      //
      // It runs *after* the literal pass and only when that pass found nothing,
      // so the common case is untouched — same speed, no extra request, and no
      // embedding spend on the searches that already work.
      const literalMiss =
        mentors.length === 0 &&
        faculty.length === 0 &&
        communities.length === 0 &&
        posts.length === 0 &&
        articles.length === 0;

      if (!literalMiss || !looksLikeAPhrase(trimmed)) return;

      setLoading(true);
      const { data } = await askWhoCanHelp(trimmed, 6).catch(() => ({ data: null }));

      if (run !== sequence.current) return;

      const related: SearchHit[] = data
        ? [...data.faculty, ...data.mentors, ...data.opportunities, ...(data.other ?? [])]
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 6)
            .map((result) => ({
              id: `semantic-${result.entity_id}`,
              title: result.title,
              subtitle: result.subtitle ?? "",
              to: result.source_path,
              image:
                typeof result.metadata?.image_url === "string"
                  ? result.metadata.image_url
                  : typeof result.metadata?.profile_image === "string"
                    ? result.metadata.profile_image
                    : null,
            }))
        : [];

      setResults((current) => ({ ...current, related }));
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  // `related` counts here. Without it the palette renders "Nothing matched"
  // directly above the results the semantic pass just found.
  const isEmpty =
    results.mentors.length === 0 &&
    results.faculty.length === 0 &&
    results.communities.length === 0 &&
    results.posts.length === 0 &&
    results.articles.length === 0 &&
    results.related.length === 0;

  return { results, loading, isEmpty };
}
