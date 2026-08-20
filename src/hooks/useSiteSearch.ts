import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import {
  getCommunityKindMeta,
  listCommunities,
} from "@/integrations/supabase/services/communities";
import { getOpportunities } from "@/integrations/supabase/services/opportunities";
import {
  allResults,
  askWhoCanHelp,
  metaList,
  metaString,
  type AskResult,
} from "@/integrations/supabase/services/ask";
import { BLOG_POSTS } from "@/data/blog-posts";
import { normalise } from "@/lib/search/rank";
import { parseQuery } from "@/lib/search/query-engine";

/** What a row actually is — drives which icon and type tag it renders with. */
export type SearchHitKind =
  | "mentor"
  | "faculty"
  | "student"
  | "community"
  | "post"
  | "article"
  | "opportunity"
  | "document";

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
  opportunities: SearchHit[];
  communities: SearchHit[];
  posts: SearchHit[];
  articles: SearchHit[];
  /** Meaning-matched semantic fallback hits */
  related: SearchHit[];
}

const EMPTY: SiteSearchResults = {
  mentors: [],
  faculty: [],
  opportunities: [],
  communities: [],
  posts: [],
  articles: [],
  related: [],
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 450;
const PER_GROUP = 4;

function looksLikeAPhrase(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 3 || (words.length >= 2 && trimmed.length >= 18);
}

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
    const members = Number(result.metadata?.member_count ?? 0);
    return `${members} ${members === 1 ? "member" : "members"}`;
  }

  if (result.entity_type === "post") {
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

function searchArticles(query: string): SearchHit[] {
  const parsed = parseQuery(query);
  const terms = Array.from(
    new Set([normalise(query), ...parsed.tokens.map(normalise), ...parsed.expandedPhrases.map(normalise)]),
  ).filter(Boolean);

  return BLOG_POSTS.filter((post) => {
    const haystack = normalise(`${post.title} ${post.excerpt} ${post.tags.join(" ")}`);
    return terms.some((t) => haystack.includes(t));
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
 * Live instant results for the site search command palette.
 */
export function useSiteSearch(query: string, enabled: boolean) {
  const [results, setResults] = useState<SiteSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (!enabled || trimmed.length < MIN_QUERY_LENGTH) {
      sequence.current += 1;
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    const run = ++sequence.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      const parsed = parseQuery(trimmed);
      const searchTerms = parsed.nameTokens.length > 0 ? parsed.nameTokens.join(" ") : trimmed;

      const [mentorResult, facultyResult, oppResult, postResult, communityResult] = await Promise.all([
        searchMentors(trimmed).catch(() => ({ data: null, error: true })),
        getFacultyList({ search: searchTerms, limit: PER_GROUP, sort: "rating" }).catch(() => ({
          data: [],
        })),
        getOpportunities({ search: searchTerms, limit: PER_GROUP }).catch(() => ({
          data: [],
        })),
        getCommunityPosts({ search: searchTerms, limit: PER_GROUP }).catch(() => ({ data: null })),
        listCommunities({ search: searchTerms, limit: PER_GROUP }).catch(() => ({ data: [] })),
      ]);

      if (run !== sequence.current) return;

      const mentors: SearchHit[] = (mentorResult.data ?? []).slice(0, PER_GROUP).map((mentor) => ({
        id: mentor.id,
        title: mentor.name ?? "Mentor",
        subtitle: [mentor.department, (mentor.skills ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · "),
        to: `/mentor/${mentor.id}`,
        image: mentor.profile_image,
        kind: "mentor",
      }));

      const faculty: SearchHit[] = (facultyResult.data ?? []).slice(0, PER_GROUP).map((person) => ({
        id: person.id,
        title: person.name,
        subtitle: [person.designation, person.department].filter(Boolean).join(" · "),
        to: `/faculty/${person.slug}`,
        image: person.image_url,
        kind: "faculty",
      }));

      const opportunities: SearchHit[] = (oppResult.data ?? []).slice(0, PER_GROUP).map((opp) => ({
        id: opp.id,
        title: opp.title,
        subtitle: [opp.kind ? opp.kind.toUpperCase() : "OPPORTUNITY", opp.organiser].filter(Boolean).join(" · "),
        to: `/opportunities/${opp.slug}`,
        kind: "opportunity",
      }));

      const posts: SearchHit[] = (postResult.data ?? []).slice(0, PER_GROUP).map((post) => ({
        id: post.id,
        title: post.title,
        subtitle: `${post.author.name} · ${post.comments_count} ${
          post.comments_count === 1 ? "reply" : "replies"
        }`,
        to: `/posts/${post.id}`,
        kind: "post",
      }));

      const communities: SearchHit[] = (communityResult.data ?? []).slice(0, PER_GROUP).map((community) => ({
        id: community.id,
        title: community.name,
        subtitle: `${getCommunityKindMeta(community.kind).label} · ${community.member_count} ${
          community.member_count === 1 ? "member" : "members"
        }`,
        to: `/workspace-groups/${community.slug}`,
        image: community.cover_image,
        kind: "community",
      }));

      const articles = searchArticles(trimmed);
      setResults({ mentors, faculty, opportunities, communities, posts, articles, related: [] });
      setLoading(false);

      // Semantic pass for questions & phrases
      // Always run semantic for queries >= 3 chars to catch short domain terms
      if (trimmed.length < 3) return;

      setLoading(true);
      const { data } = await askWhoCanHelp(trimmed, 12).catch(() => ({ data: null }));

      if (run !== sequence.current) return;

      const alreadyShown = new Set(
        [...mentors, ...faculty, ...opportunities, ...communities, ...posts].map((hit) => hit.id),
      );

      const related: SearchHit[] = data
        ? allResults(data)
            .filter((result) => !alreadyShown.has(result.entity_id))
            .slice(0, 4)
            .map((result) => ({
              id: `semantic-${result.entity_id}`,
              title: result.title,
              subtitle: relatedSubtitle(result),
              to: result.source_path,
              image:
                typeof result.metadata?.cover_image === "string"
                  ? result.metadata.cover_image
                  : typeof result.metadata?.image_url === "string"
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

  const isEmpty =
    results.mentors.length === 0 &&
    results.faculty.length === 0 &&
    results.opportunities.length === 0 &&
    results.communities.length === 0 &&
    results.posts.length === 0 &&
    results.articles.length === 0 &&
    results.related.length === 0;

  return { results, loading, isEmpty };
}
