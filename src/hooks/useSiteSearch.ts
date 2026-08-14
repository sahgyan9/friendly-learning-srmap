import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import {
  getCommunityKindMeta,
  listCommunities,
} from "@/integrations/supabase/services/communities";
import {
  allResults,
  askWhoCanHelp,
  metaList,
  metaString,
  type AskResult,
} from "@/integrations/supabase/services/ask";
import { BLOG_POSTS } from "@/data/blog-posts";
import { normalise } from "@/lib/search/rank";

/** What a row actually is — drives which icon and type tag it renders with. */
export type SearchHitKind =
  | "mentor"
  | "faculty"
  | "student"
  | "community"
  | "post"
  | "article"
  | "opportunity";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  kind: SearchHitKind;
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
 * Gate for the semantic pass.
 *
 * Every keystroke could be sent to the embedding search, but most short inputs
 * are half-typed names ("anj", "dr r") that the next keystroke fixes on its own,
 * and each uncached call spends one of a limited number of embedding requests
 * per minute. A phrase — two words with some length to them, or one long word —
 * is the cheapest signal that someone finished expressing a thought rather than
 * started spelling a name. "dr r" has a space and is deliberately excluded.
 */
function looksLikeAPhrase(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length >= 14 || (/\s/.test(trimmed) && trimmed.length >= 8);
}

/**
 * Every "Closest to what you asked" row used to show department, so four
 * professors from the same CS department rendered an identical subtitle —
 * a list you had to trust rather than one you could verify. The actual
 * reason a thing matched is already in `metadata`; this surfaces that.
 *
 * The row also has to say *what kind of thing it is*. This group deliberately
 * mixes professors, seniors, groups and threads, and a bare title gives no way
 * to tell a study group from a student — so anything that is not a person
 * leads with its type.
 */
function relatedSubtitle(result: AskResult): string {
  if (result.entity_type === "faculty") {
    const interests = metaList(result, "interests");
    if (interests.length) return interests.slice(0, 3).join(", ");
  }

  if (result.entity_type === "mentor") {
    const skills = metaList(result, "skills");
    if (skills.length) return skills.slice(0, 3).join(", ");
  }

  if (result.entity_type === "student") {
    const interests = metaList(result, "interests");
    if (interests.length) return interests.slice(0, 3).join(", ");
  }

  if (result.entity_type === "community") {
    // No leading "Group ·" here — the row's type tag says that now.
    const members = Number(result.metadata?.member_count ?? 0);
    return `${members} ${members === 1 ? "member" : "members"}`;
  }

  if (result.entity_type === "post") {
    // No leading "Post in" here — the row's type tag says that now.
    const replies = Number(result.metadata?.comments_count ?? 0);
    const where = metaString(result, "community_name") ?? "Community board";
    return `${where} · ${replies} ${replies === 1 ? "reply" : "replies"}`;
  }

  if (result.entity_type === "opportunity") {
    const kind = metaString(result, "kind");
    const organiser = metaString(result, "organiser");
    return [kind ? kind[0].toUpperCase() + kind.slice(1) : "Opportunity", organiser]
      .filter(Boolean)
      .join(" · ");
  }

  return result.subtitle ?? "";
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
      kind: "article" as const,
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
        kind: "mentor",
      }));

      const faculty: SearchHit[] = (facultyResult.data ?? []).map((person) => ({
        id: person.id,
        title: person.name,
        subtitle: [person.designation, person.department].filter(Boolean).join(" · "),
        to: `/faculty/${person.slug}`,
        image: person.image_url,
        kind: "faculty",
      }));

      const posts: SearchHit[] = (postResult.data ?? []).map((post) => ({
        id: post.id,
        title: post.title,
        subtitle: `${post.author.name} · ${post.comments_count} ${
          post.comments_count === 1 ? "reply" : "replies"
        }`,
        to: `/posts/${post.id}`,
        kind: "post",
      }));

      const communities: SearchHit[] = (communityResult.data ?? []).map((community) => ({
        id: community.id,
        title: community.name,
        subtitle: `${getCommunityKindMeta(community.kind).label} · ${community.member_count} ${
          community.member_count === 1 ? "member" : "members"
        }`,
        to: `/workspace-groups/${community.slug}`,
        kind: "community",
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
      // This used to run only when the literal pass found *nothing*, which
      // sounded thrifty and quietly capped how good the search could be: one
      // incidental keyword hit — a professor whose name contains "ai" — was
      // enough to suppress the group and the thread that actually answered the
      // question. The whole point of the second pass is that it knows things
      // the first one cannot, so it now runs whenever the input reads like a
      // question, alongside the literal pass rather than behind it.
      //
      // Cost stays bounded by two things that were already here: the phrase
      // gate above, and the query cache in the edge function, which turns every
      // repeat of a question into a primary-key lookup instead of an embedding
      // call. Campus searches repeat heavily, so the cache does most of the work.
      if (!looksLikeAPhrase(trimmed)) return;

      setLoading(true);
      const { data } = await askWhoCanHelp(trimmed, 12).catch(() => ({ data: null }));

      if (run !== sequence.current) return;

      // Anything the literal pass already showed is dropped rather than
      // repeated. The ids match on both sides (both are the row's primary key),
      // so a group found by name does not appear twice under two headings.
      const alreadyShown = new Set(
        [...mentors, ...faculty, ...communities, ...posts].map((hit) => hit.id),
      );

      const related: SearchHit[] = data
        ? allResults(data)
            .filter((result) => !alreadyShown.has(result.entity_id))
            .slice(0, 6)
            .map((result) => ({
              id: `semantic-${result.entity_id}`,
              title: result.title,
              subtitle: relatedSubtitle(result),
              to: result.source_path,
              image:
                typeof result.metadata?.image_url === "string"
                  ? result.metadata.image_url
                  : typeof result.metadata?.profile_image === "string"
                    ? result.metadata.profile_image
                    : null,
              kind: result.entity_type,
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
