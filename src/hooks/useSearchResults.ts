import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { listCommunities, getCommunityKindMeta } from "@/integrations/supabase/services/communities";
import { askWhoCanHelp, allResults } from "@/integrations/supabase/services/ask";
import { BLOG_POSTS } from "@/data/blog-posts";
import { normalise } from "@/lib/search/rank";
import type { SearchTab } from "@/lib/search/search-params";

/**
 * Per-category result counts, used to drive tab badges.
 * A value of -1 means "not yet loaded".
 */
export interface SearchCounts {
  mentors: number;
  faculty: number;
  communities: number;
  posts: number;
  blog: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  image?: string | null;
  /** Extra metadata surfaced on cards */
  meta?: Record<string, unknown>;
}

export interface SearchResultsState {
  mentors: SearchResultItem[];
  faculty: SearchResultItem[];
  /**
   * Semantic-only — there is no literal `students` table search, so this is
   * populated purely from the `semantic-search` edge function's `students`
   * group. Empty (never populated) until that group is deployed; nothing else
   * needs to change when it lands.
   */
  students: SearchResultItem[];
  communities: SearchResultItem[];
  posts: SearchResultItem[];
  blog: SearchResultItem[];
  counts: SearchCounts;
  loading: boolean;
  /** True while counts are still resolving (first parallel batch). */
  countsLoading: boolean;
  hasMore: boolean;
  total: number;
}

const EMPTY: SearchResultsState = {
  mentors: [],
  faculty: [],
  students: [],
  communities: [],
  posts: [],
  blog: [],
  counts: { mentors: -1, faculty: -1, communities: -1, posts: -1, blog: -1 },
  loading: false,
  countsLoading: false,
  hasMore: false,
  total: 0,
};

/** Items per page on a single-category tab */
const PAGE_SIZE = 20;
/** Preview cards shown per category on the "All" tab */
const ALL_PREVIEW = 3;

const STOP_WORDS = new Set([
  "i", "want", "to", "learn", "how", "can", "who", "help", "me", "with", "is",
  "a", "an", "the", "for", "in", "on", "of", "and", "or", "best", "which", "any",
  "about", "find", "looking", "need", "please", "tell", "show", "am", "are", "what"
]);

/** Extract core search terms by removing natural language filler words. */
export function extractKeywords(query: string): string {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return words.join(" ").trim() || query.trim();
}

/** Blog posts are bundled with the app — match them locally. */
function searchBlogLocally(q: string, limit: number): SearchResultItem[] {
  const keywords = extractKeywords(q);
  const terms = Array.from(new Set([normalise(q), normalise(keywords), ...keywords.split(/\s+/).map(normalise)])).filter(Boolean);

  return BLOG_POSTS.filter((p) => {
    const hay = normalise(`${p.title} ${p.excerpt} ${p.tags.join(" ")}`);
    return terms.some((t) => hay.includes(t));
  })
    .slice(0, limit)
    .map((p) => ({
      id: p.slug,
      title: p.title,
      subtitle: `${p.readingMinutes} min read · ${p.tags.slice(0, 2).join(", ")}`,
      to: `/blog/${p.slug}`,
    }));
}

/**
 * Heavy search hook for the /search results page.
 *
 * Enhanced to support keyword extraction & semantic fallback so phrase queries
 * like "I want to learn quantum computing" find matching mentors, faculty, groups & posts.
 */
export function useSearchResults(q: string, tab: SearchTab, offset = 0) {
  const [state, setState] = useState<SearchResultsState>(EMPTY);
  const sequence = useRef(0);

  useEffect(() => {
    const trimmed = q.trim();

    if (!trimmed) {
      sequence.current += 1;
      setState(EMPTY);
      return;
    }

    const run = ++sequence.current;

    setState((prev) => ({
      ...prev,
      loading: true,
      countsLoading: tab === "all" || offset === 0,
    }));

    const limit = tab === "all" ? ALL_PREVIEW : PAGE_SIZE;
    const searchTerm = extractKeywords(trimmed);

    async function fetchAll() {
      const tokens = searchTerm.split(/\s+/).filter(Boolean);
      const primaryToken = tokens[0] || searchTerm;

      const [mentorRes, facultyRes, postRes, communityRes, semanticRes] = await Promise.all([
        searchMentors(searchTerm).catch(() => ({ data: null })),
        getFacultyList({ search: searchTerm, limit, sort: "rating", offset: tab === "faculty" ? offset : 0 }).catch(() => ({ data: [], total: 0 })),
        getCommunityPosts({ search: searchTerm, limit, offset: tab === "posts" ? offset : 0 }).catch(() => ({ data: null, total: 0 })),
        listCommunities({ search: searchTerm, limit, offset: tab === "communities" ? offset : 0 }).catch(() => ({ data: [], total: 0 })),
        askWhoCanHelp(trimmed, 15).catch(() => ({ data: null })),
      ]);

      if (run !== sequence.current) return;

      // Token fallback if primary phrase returned empty for communities or posts
      let fallbackCommunityData = communityRes.data ?? [];
      if (fallbackCommunityData.length === 0 && tokens.length > 1) {
        const tokenRes = await listCommunities({ search: primaryToken, limit, offset: 0 }).catch(() => ({ data: [] }));
        fallbackCommunityData = tokenRes.data ?? [];
      }

      let fallbackPostData = postRes.data ?? [];
      if (fallbackPostData.length === 0 && tokens.length > 1) {
        const tokenRes = await getCommunityPosts({ search: primaryToken, limit, offset: 0 }).catch(() => ({ data: null }));
        fallbackPostData = tokenRes.data ?? [];
      }

      const mentorMap = new Map<string, SearchResultItem>();
      const facultyMap = new Map<string, SearchResultItem>();
      const studentMap = new Map<string, SearchResultItem>();
      const postMap = new Map<string, SearchResultItem>();
      const communityMap = new Map<string, SearchResultItem>();

      // 1. Process primary database search results
      (mentorRes.data ?? []).forEach((m) => {
        mentorMap.set(m.id, {
          id: m.id,
          title: m.name ?? "Mentor",
          subtitle: [m.department, (m.skills ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · "),
          to: `/mentor/${m.id}`,
          image: m.profile_image,
          meta: { rating: m.rating, review_count: m.review_count, department: m.department, skills: m.skills },
        });
      });

      (facultyRes.data ?? []).forEach((f) => {
        facultyMap.set(f.id, {
          id: f.id,
          title: f.name,
          subtitle: [f.designation, f.department].filter(Boolean).join(" · "),
          to: `/faculty/${f.slug}`,
          image: f.image_url,
          meta: { avg_overall: f.avg_overall, rating_count: f.rating_count, department: f.department },
        });
      });

      fallbackPostData.forEach((p) => {
        postMap.set(p.id, {
          id: p.id,
          title: p.title,
          subtitle: `${p.author.name} · ${p.comments_count} ${p.comments_count === 1 ? "reply" : "replies"}`,
          to: `/community-posts/${p.id}`,
          meta: { post_type: p.post_type, community: p.community, likes_count: p.likes_count },
        });
      });

      fallbackCommunityData.forEach((c) => {
        communityMap.set(c.id, {
          id: c.id,
          title: c.name,
          subtitle: `${getCommunityKindMeta(c.kind).label} · ${c.member_count} ${c.member_count === 1 ? "member" : "members"}`,
          to: `/communities/${c.slug}`,
          image: c.cover_image,
          meta: { kind: c.kind, member_count: c.member_count },
        });
      });

      // 2. Process semantic search results (fills in any missing results for phrase queries)
      if (semanticRes.data) {
        const semanticHits = allResults(semanticRes.data);
        semanticHits.forEach((hit) => {
          if (hit.entity_type === "mentor" && !mentorMap.has(hit.entity_id)) {
            mentorMap.set(hit.entity_id, {
              id: hit.entity_id,
              title: hit.title,
              subtitle: hit.subtitle ?? "Mentor",
              to: `/mentor/${hit.entity_id}`,
              image: typeof hit.metadata?.profile_image === "string" ? hit.metadata.profile_image : null,
              meta: hit.metadata,
            });
          } else if (hit.entity_type === "faculty" && !facultyMap.has(hit.entity_id)) {
            facultyMap.set(hit.entity_id, {
              id: hit.entity_id,
              title: hit.title,
              subtitle: hit.subtitle ?? "Faculty",
              to: hit.source_path || `/faculty/${hit.entity_id}`,
              image: typeof hit.metadata?.image_url === "string" ? hit.metadata.image_url : null,
              meta: hit.metadata,
            });
          } else if (hit.entity_type === "student" && !studentMap.has(hit.entity_id)) {
            studentMap.set(hit.entity_id, {
              id: hit.entity_id,
              title: hit.title,
              subtitle: hit.subtitle ?? "Student",
              to: hit.source_path,
              image: typeof hit.metadata?.profile_image === "string" ? hit.metadata.profile_image : null,
              meta: hit.metadata,
            });
          } else if (hit.entity_type === "community" && !communityMap.has(hit.entity_id)) {
            communityMap.set(hit.entity_id, {
              id: hit.entity_id,
              title: hit.title,
              subtitle: hit.subtitle ?? "Group",
              to: hit.source_path || `/communities/${hit.entity_id}`,
              meta: hit.metadata,
            });
          } else if (hit.entity_type === "post" && !postMap.has(hit.entity_id)) {
            postMap.set(hit.entity_id, {
              id: hit.entity_id,
              title: hit.title,
              subtitle: hit.subtitle ?? "Community post",
              to: hit.source_path || `/community-posts/${hit.entity_id}`,
              meta: hit.metadata,
            });
          }
        });
      }

      const allMentorsList = Array.from(mentorMap.values());
      const allFacultyList = Array.from(facultyMap.values());
      const allStudentsList = Array.from(studentMap.values());
      const allPostsList = Array.from(postMap.values());
      const allCommunitiesList = Array.from(communityMap.values());

      const pagedMentors = tab === "mentors"
        ? allMentorsList.slice(offset, offset + PAGE_SIZE)
        : allMentorsList.slice(0, ALL_PREVIEW);

      const pagedFaculty = tab === "faculty"
        ? allFacultyList.slice(offset, offset + PAGE_SIZE)
        : allFacultyList.slice(0, ALL_PREVIEW);

      // No dedicated tab (semantic-only group), so always the preview slice.
      const pagedStudents = allStudentsList.slice(0, ALL_PREVIEW);

      const pagedPosts = tab === "posts"
        ? allPostsList.slice(offset, offset + PAGE_SIZE)
        : allPostsList.slice(0, ALL_PREVIEW);

      const pagedCommunities = tab === "communities"
        ? allCommunitiesList.slice(offset, offset + PAGE_SIZE)
        : allCommunitiesList.slice(0, ALL_PREVIEW);

      const blogLimit = tab === "blog" ? PAGE_SIZE : ALL_PREVIEW;
      const blog = searchBlogLocally(trimmed, blogLimit);

      const counts: SearchCounts = {
        mentors: allMentorsList.length,
        faculty: Math.max((facultyRes as { total?: number }).total ?? 0, allFacultyList.length),
        communities: Math.max((communityRes as { total?: number }).total ?? 0, allCommunitiesList.length),
        posts: Math.max((postRes as { total?: number }).total ?? 0, allPostsList.length),
        blog: searchBlogLocally(trimmed, 999).length,
      };

      // Determine active list for hasMore / total
      let total = 0;
      let hasMore = false;
      if (tab === "mentors") {
        total = counts.mentors;
        hasMore = offset + PAGE_SIZE < total;
      } else if (tab === "faculty") {
        total = counts.faculty;
        hasMore = offset + PAGE_SIZE < total;
      } else if (tab === "communities") {
        total = counts.communities;
        hasMore = offset + PAGE_SIZE < total;
      } else if (tab === "posts") {
        total = counts.posts;
        hasMore = offset + PAGE_SIZE < total;
      } else if (tab === "blog") {
        total = counts.blog;
        hasMore = false;
      }

      if (run !== sequence.current) return;

      setState({
        mentors: pagedMentors,
        faculty: pagedFaculty,
        students: pagedStudents,
        communities: pagedCommunities,
        posts: pagedPosts,
        blog,
        counts,
        loading: false,
        countsLoading: false,
        hasMore,
        total,
      });
    }

    fetchAll();
  }, [q, tab, offset]);

  return state;
}
