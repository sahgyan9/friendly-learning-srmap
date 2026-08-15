import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { listCommunities, getCommunityKindMeta } from "@/integrations/supabase/services/communities";
import { getOpportunities } from "@/integrations/supabase/services/opportunities";
import { askWhoCanHelp, allResults } from "@/integrations/supabase/services/ask";
import { BLOG_POSTS } from "@/data/blog-posts";
import { normalise } from "@/lib/search/rank";
import { parseQuery, calculateExactBoost, fuzzyMatchTokens } from "@/lib/search/query-engine";
import type { SearchTab } from "@/lib/search/search-params";

/**
 * Per-category result counts, used to drive tab badges.
 * A value of -1 means "not yet loaded".
 */
export interface SearchCounts {
  mentors: number;
  faculty: number;
  opportunities: number;
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
  /** Internal relevance score for ranking */
  relevanceScore?: number;
}

export interface SearchResultsState {
  mentors: SearchResultItem[];
  faculty: SearchResultItem[];
  students: SearchResultItem[];
  opportunities: SearchResultItem[];
  communities: SearchResultItem[];
  posts: SearchResultItem[];
  blog: SearchResultItem[];
  counts: SearchCounts;
  suggestedCorrection: string | null;
  loading: boolean;
  countsLoading: boolean;
  hasMore: boolean;
  total: number;
}

const EMPTY: SearchResultsState = {
  mentors: [],
  faculty: [],
  students: [],
  opportunities: [],
  communities: [],
  posts: [],
  blog: [],
  counts: { mentors: -1, faculty: -1, opportunities: -1, communities: -1, posts: -1, blog: -1 },
  suggestedCorrection: null,
  loading: false,
  countsLoading: false,
  hasMore: false,
  total: 0,
};

/** Items per page on a single-category tab */
const PAGE_SIZE = 20;
/** Preview cards shown per category on the "All" tab */
const ALL_PREVIEW = 3;

/** Blog posts are bundled with the app — match them locally against real subject keywords only. */
function searchBlogLocally(parsed: import("@/lib/search/query-engine").ParsedQuery, limit: number): SearchResultItem[] {
  // If query is specifically looking for faculty/professors, suppress blog posts unless subject matches
  const terms = Array.from(
    new Set([
      ...parsed.subjectTokens.map(normalise),
      ...parsed.expandedPhrases.map(normalise),
    ]),
  ).filter((t) => t.length >= 3);

  if (terms.length === 0) return [];

  return BLOG_POSTS.filter((p) => {
    const titleAndTags = normalise(`${p.title} ${p.tags.join(" ")}`);
    return terms.some((t) => titleAndTags.includes(t));
  })
    .slice(0, limit)
    .map((p) => ({
      id: p.slug,
      title: p.title,
      subtitle: `${p.readingMinutes} min read · ${p.tags.slice(0, 2).join(", ")}`,
      to: `/blog/${p.slug}`,
      meta: { tags: p.tags, date: p.date },
    }));
}

/**
 * Intelligent search hook for the /search results page.
 *
 * Implements Multi-Entity Retrieval + Campus Synonyms & Typo Tolerance +
 * Reciprocal Rank Fusion across exact lexical hits and semantic embeddings.
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
    const parsed = parseQuery(trimmed);

    async function fetchAll() {
      const searchTerms = parsed.subjectTokens.length > 0 ? parsed.subjectTokens.join(" ") : trimmed;

      const [mentorRes, facultyRes, oppRes, postRes, communityRes, semanticRes] = await Promise.all([
        searchMentors(trimmed).catch(() => ({ data: null })),
        getFacultyList({
          search: searchTerms,
          limit: tab === "faculty" ? limit + offset : limit * 3,
          sort: "rating",
          offset: 0,
        }).catch(() => ({ data: [], total: 0 })),
        getOpportunities({
          search: searchTerms,
          limit: tab === "opportunities" ? limit + offset : limit * 3,
          offset: 0,
        }).catch(() => ({ data: [], total: 0 })),
        getCommunityPosts({
          search: searchTerms,
          limit: tab === "posts" ? limit + offset : limit * 3,
          offset: 0,
        }).catch(() => ({ data: null, total: 0 })),
        listCommunities({
          search: searchTerms,
          limit: tab === "communities" ? limit + offset : limit * 3,
          offset: 0,
        }).catch(() => ({ data: [], total: 0 })),
        askWhoCanHelp(trimmed, 20).catch(() => ({ data: null })),
      ]);

      if (run !== sequence.current) return;

      const mentorMap = new Map<string, SearchResultItem>();
      const facultyMap = new Map<string, SearchResultItem>();
      const studentMap = new Map<string, SearchResultItem>();
      const oppMap = new Map<string, SearchResultItem>();
      const postMap = new Map<string, SearchResultItem>();
      const communityMap = new Map<string, SearchResultItem>();

      // 1. Process Mentors (with exact ranking boost)
      (mentorRes.data ?? []).forEach((m, idx) => {
        // If department was detected, skip non-matching mentors
        if (parsed.detectedDepartment) {
          const dept = (m.department || "").toLowerCase();
          const skills = (m.skills || []).map((s) => s.toLowerCase());
          if (!dept.includes(parsed.detectedDepartment.toLowerCase()) && !skills.some((s) => s.includes(parsed.detectedDepartment!.toLowerCase()))) {
            return;
          }
        }

        const boost = calculateExactBoost(m.name ?? "", trimmed, parsed.nameTokens);
        mentorMap.set(m.id, {
          id: m.id,
          title: m.name ?? "Mentor",
          subtitle: [m.department, (m.skills ?? []).slice(0, 3).join(", ")].filter(Boolean).join(" · "),
          to: `/mentor/${m.id}`,
          image: m.profile_image,
          meta: { rating: m.rating, review_count: m.review_count, department: m.department, skills: m.skills },
          relevanceScore: 100 + boost * 50 - idx,
        });
      });

      // 2. Process Faculty (with exact name ranking boost & department priority)
      (facultyRes.data ?? []).forEach((f, idx) => {
        const boost = calculateExactBoost(f.name, trimmed, parsed.nameTokens);
        let deptBoost = 0;
        if (parsed.detectedDepartment && f.department.toLowerCase().includes(parsed.detectedDepartment.toLowerCase())) {
          deptBoost = 200;
        }

        facultyMap.set(f.id, {
          id: f.id,
          title: f.name,
          subtitle: [f.designation, f.department].filter(Boolean).join(" · "),
          to: `/faculty/${f.slug}`,
          image: f.image_url,
          meta: { avg_overall: f.avg_overall, rating_count: f.rating_count, department: f.department },
          relevanceScore: 100 + deptBoost + boost * 50 - idx,
        });
      });

      // 3. Process Opportunities
      (oppRes.data ?? []).forEach((o, idx) => {
        const boost = calculateExactBoost(o.title, trimmed, parsed.tokens);
        oppMap.set(o.id, {
          id: o.id,
          title: o.title,
          subtitle: [o.kind ? o.kind.toUpperCase() : "OPPORTUNITY", o.organiser].filter(Boolean).join(" · "),
          to: `/opportunities/${o.slug}`,
          meta: {
            kind: o.kind,
            organiser: o.organiser,
            register_by: o.register_by,
            interest_count: o.interest_count,
            tags: o.tags,
            is_online: o.is_online,
          },
          relevanceScore: 100 + boost * 50 - idx,
        });
      });

      // 4. Process Posts
      (postRes.data ?? []).forEach((p, idx) => {
        postMap.set(p.id, {
          id: p.id,
          title: p.title,
          subtitle: `${p.author.name} · ${p.comments_count} ${p.comments_count === 1 ? "reply" : "replies"}`,
          to: `/posts/${p.id}`,
          meta: { post_type: p.post_type, community: p.community, likes_count: p.likes_count, tags: p.tags },
          relevanceScore: 90 - idx,
        });
      });

      // 5. Process Communities
      (communityRes.data ?? []).forEach((c, idx) => {
        communityMap.set(c.id, {
          id: c.id,
          title: c.name,
          subtitle: `${getCommunityKindMeta(c.kind).label} · ${c.member_count} ${c.member_count === 1 ? "member" : "members"}`,
          to: `/workspace-groups/${c.slug}`,
          image: c.cover_image,
          meta: { kind: c.kind, member_count: c.member_count, description: c.description },
          relevanceScore: 90 - idx,
        });
      });

      // 6. Seamlessly blend Semantic vector search hits
      if (semanticRes.data) {
        const semanticHits = allResults(semanticRes.data);
        semanticHits.forEach((hit) => {
          const simScore = (hit.similarity ?? 0.5) * 80;

          if (hit.entity_type === "mentor") {
            if (parsed.detectedDepartment) {
              const dept = (hit.subtitle || "").toLowerCase();
              if (!dept.includes(parsed.detectedDepartment.toLowerCase())) return;
            }

            if (!mentorMap.has(hit.entity_id)) {
              mentorMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Mentor",
                to: `/mentor/${hit.entity_id}`,
                image: typeof hit.metadata?.profile_image === "string" ? hit.metadata.profile_image : null,
                meta: hit.metadata,
                relevanceScore: simScore,
              });
            }
          } else if (hit.entity_type === "faculty") {
            if (parsed.detectedDepartment) {
              const dept = (hit.subtitle || "").toLowerCase();
              if (!dept.includes(parsed.detectedDepartment.toLowerCase())) return;
            }

            if (!facultyMap.has(hit.entity_id)) {
              facultyMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Faculty",
                to: hit.source_path || `/faculty/${hit.entity_id}`,
                image: typeof hit.metadata?.image_url === "string" ? hit.metadata.image_url : null,
                meta: hit.metadata,
                relevanceScore: simScore,
              });
            }
          } else if (hit.entity_type === "student") {
            if (!studentMap.has(hit.entity_id)) {
              studentMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Student",
                to: hit.source_path,
                image: typeof hit.metadata?.profile_image === "string" ? hit.metadata.profile_image : null,
                meta: hit.metadata,
                relevanceScore: simScore,
              });
            }
          } else if (hit.entity_type === "opportunity") {
            if (!oppMap.has(hit.entity_id)) {
              oppMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Opportunity",
                to: hit.source_path || `/opportunities/${hit.entity_id}`,
                meta: hit.metadata,
                relevanceScore: simScore,
              });
            }
          } else if (hit.entity_type === "community") {
            if (!communityMap.has(hit.entity_id)) {
              const path =
                hit.source_path?.replace("/communities/", "/workspace-groups/") ||
                `/workspace-groups/${hit.entity_id}`;
              communityMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Group",
                to: path,
                meta: hit.metadata,
                relevanceScore: simScore,
              });
            }
          } else if (hit.entity_type === "post") {
            if (!postMap.has(hit.entity_id)) {
              const path = hit.source_path?.replace("/community-posts/", "/posts/") || `/posts/${hit.entity_id}`;
              postMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Post",
                to: path,
                meta: hit.metadata,
                relevanceScore: simScore,
              });
            }
          }
        });
      }

      // Sort every category list by computed relevance score
      const sortList = (items: SearchResultItem[]) =>
        [...items].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));

      const allMentorsList = sortList(Array.from(mentorMap.values()));
      const allFacultyList = sortList(Array.from(facultyMap.values()));
      const allStudentsList = sortList(Array.from(studentMap.values()));
      const allOppList = sortList(Array.from(oppMap.values()));
      const allPostsList = sortList(Array.from(postMap.values()));
      const allCommunitiesList = sortList(Array.from(communityMap.values()));

      const pagedMentors =
        tab === "mentors" ? allMentorsList.slice(offset, offset + PAGE_SIZE) : allMentorsList.slice(0, ALL_PREVIEW);

      const pagedFaculty =
        tab === "faculty" ? allFacultyList.slice(offset, offset + PAGE_SIZE) : allFacultyList.slice(0, ALL_PREVIEW);

      const pagedStudents = allStudentsList.slice(0, ALL_PREVIEW);

      const pagedOpportunities =
        tab === "opportunities" ? allOppList.slice(offset, offset + PAGE_SIZE) : allOppList.slice(0, ALL_PREVIEW);

      const pagedPosts =
        tab === "posts" ? allPostsList.slice(offset, offset + PAGE_SIZE) : allPostsList.slice(0, ALL_PREVIEW);

      const pagedCommunities =
        tab === "communities"
          ? allCommunitiesList.slice(offset, offset + PAGE_SIZE)
          : allCommunitiesList.slice(0, ALL_PREVIEW);

      const blogLimit = tab === "blog" ? PAGE_SIZE : ALL_PREVIEW;
      const blog = searchBlogLocally(parsed, blogLimit);

      const counts: SearchCounts = {
        mentors: allMentorsList.length,
        faculty: parsed.detectedDepartment ? allFacultyList.length : Math.max((facultyRes as { total?: number }).total ?? 0, allFacultyList.length),
        opportunities: allOppList.length,
        communities: allCommunitiesList.length,
        posts: allPostsList.length,
        blog: searchBlogLocally(parsed, 999).length,
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
      } else if (tab === "opportunities") {
        total = counts.opportunities;
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
        opportunities: pagedOpportunities,
        communities: pagedCommunities,
        posts: pagedPosts,
        blog,
        counts,
        suggestedCorrection: parsed.suggestedQuery,
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
