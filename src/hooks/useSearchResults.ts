import { useEffect, useRef, useState } from "react";

import { getFacultyList } from "@/integrations/supabase/services/faculty";
import { getCommunityPosts } from "@/integrations/supabase/services/community-posts";
import { searchMentors } from "@/integrations/supabase/services/mentors";
import { listCommunities, getCommunityKindMeta } from "@/integrations/supabase/services/communities";
import { getOpportunities } from "@/integrations/supabase/services/opportunities";
import { askWhoCanHelp, allResults } from "@/integrations/supabase/services/ask";
import { supabase } from "@/integrations/supabase/client";

// Global cache for click-through rate boosts
let qualityCache: Record<string, number> | null = null;
let qualityPromise: Promise<void> | null = null;

async function loadSearchQuality() {
  if (qualityCache) return;
  if (!qualityPromise) {
    qualityPromise = (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("search_result_quality")
          .select("entity_id, click_count_30d");
        
        qualityCache = {};
        if (data && !error) {
          (data as any[]).forEach(row => {
            qualityCache![row.entity_id] = row.click_count_30d;
          });
        }
      } catch (e) {
        console.error("Failed to load search quality:", e);
        qualityCache = {};
      }
    })();
  }
  return qualityPromise;
}
import { BLOG_POSTS } from "@/data/blog-posts";
import { normalise } from "@/lib/search/rank";
import { parseQuery, calculateExactBoost, fuzzyMatchTokens, matchesWordBoundary, hasTopicalMatch } from "@/lib/search/query-engine";
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
  documents: number;
  blog: number;
}

export interface SearchSitelink {
  label: string;
  to: string;
  isExternal?: boolean;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  image?: string | null;
  /** Entity category identifier */
  entityType?: "faculty" | "mentor" | "student" | "opportunity" | "community" | "post" | "document" | "blog";
  /** Human-readable entity badge text (e.g. 'FACULTY', 'SENIOR MENTOR', 'COMMUNITY GROUP') */
  badge?: string;
  /** Google-style URL breadcrumb path (e.g. 'friendlylearning.in › faculty › dr-avinash-trivedi') */
  breadcrumb?: string;
  /** Rich snippet / contextual excerpt for SERP */
  snippet?: string;
  /** Highlight tokens or match reason indicator */
  matchReason?: string;
  matchedTokens?: string[];
  /** Mini sitelinks for Google-style deep direct navigation */
  sitelinks?: SearchSitelink[];
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
  documents: SearchResultItem[];
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
  documents: [],
  blog: [],
  counts: { mentors: -1, faculty: -1, opportunities: -1, communities: -1, posts: -1, documents: -1, blog: -1 },
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

/** Blog posts are bundled with the app — match them locally against real subject keywords and informational guide intents. */
function searchBlogLocally(parsed: import("@/lib/search/query-engine").ParsedQuery, limit: number): SearchResultItem[] {
  // If query is an informational/guide archetype, match high-value campus guides
  if (parsed.intent === "informational") {
    const scoredBlogs = BLOG_POSTS.map((p) => {
      let score = 0;
      if (parsed.infoTopic === "fresher_guide" || parsed.infoTopic === "faculty_contact") {
        if (p.slug === "asking-for-academic-help") score += 100;
        if (p.slug === "everything-you-can-do-on-friendly-learning") score += 90;
        if (p.slug === "choosing-electives-srm-ap") score += 60;
      } else if (parsed.infoTopic === "electives") {
        if (p.slug === "choosing-electives-srm-ap") score += 100;
      } else if (parsed.infoTopic === "hackathon_prep") {
        if (p.slug === "finding-hackathon-teammates") score += 100;
      } else if (parsed.infoTopic === "academic_help") {
        if (p.slug === "asking-for-academic-help") score += 100;
      }

      // Keyword match in tags or title
      const titleAndTags = normalise(`${p.title} ${p.tags.join(" ")}`);
      parsed.subjectTokens.forEach((tok) => {
        if (tok.length >= 3 && titleAndTags.includes(tok)) score += 30;
      });

      return { post: p, score };
    })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredBlogs.slice(0, limit).map(({ post: p, score }) => ({
      id: p.slug,
      title: p.title,
      subtitle: `${p.readingMinutes} min read · ${p.tags.slice(0, 2).join(", ")}`,
      to: `/blog/${p.slug}`,
      entityType: "blog" as const,
      badge: "Campus Guide",
      breadcrumb: `friendlylearning.in › blog › ${p.slug}`,
      snippet: p.excerpt || p.standfirst,
      matchReason: `${p.readingMinutes} min read · Official Guide`,
      sitelinks: [
        { label: "Read Guide", to: `/blog/${p.slug}` },
        { label: "All Guides", to: "/blog" },
      ],
      meta: { tags: p.tags, date: p.date, readingMinutes: p.readingMinutes },
      relevanceScore: score,
    }));
  }

  // General or domain search: match subject tokens
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
      entityType: "blog" as const,
      badge: "Campus Guide",
      breadcrumb: `friendlylearning.in › blog › ${p.slug}`,
      snippet: p.excerpt || p.standfirst,
      matchReason: `${p.readingMinutes} min read`,
      sitelinks: [
        { label: "Read Guide", to: `/blog/${p.slug}` },
        { label: "All Guides", to: "/blog" },
      ],
      meta: { tags: p.tags, date: p.date, readingMinutes: p.readingMinutes },
      relevanceScore: 50,
    }));
}

/**
 * Intelligent search hook for the /search results page.
 *
 * Implements Multi-Entity Retrieval + Campus Synonyms & Typo Tolerance +
 * Reciprocal Rank Fusion across exact lexical hits and semantic embeddings,
 * fully formatted for Google-like SERP presentation.
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

      const [_, mentorRes, facultyRes, oppRes, postRes, communityRes, semanticRes] = await Promise.all([
        loadSearchQuality(),
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
        askWhoCanHelp(parsed.semanticQuery || trimmed, 20).catch(() => ({ data: null })),
      ]);

      if (run !== sequence.current) return;

      const getCtrBoost = (entityId: string) => {
        const clicks = qualityCache?.[entityId] || 0;
        return clicks > 0 ? Math.log2(1 + clicks) * 10 : 0;
      };

      const mentorMap = new Map<string, SearchResultItem>();
      const facultyMap = new Map<string, SearchResultItem>();
      const studentMap = new Map<string, SearchResultItem>();
      const oppMap = new Map<string, SearchResultItem>();
      const postMap = new Map<string, SearchResultItem>();
      const communityMap = new Map<string, SearchResultItem>();
      const documentMap = new Map<string, SearchResultItem>();

      // 1. Process Mentors (with exact ranking boost & rich snippets)
      (mentorRes.data ?? []).forEach((m, idx) => {
        if (parsed.detectedDepartment) {
          const dept = (m.department || "").toLowerCase();
          const skills = (m.skills || []).map((s) => s.toLowerCase());
          if (!dept.includes(parsed.detectedDepartment.toLowerCase()) && !skills.some((s) => s.includes(parsed.detectedDepartment!.toLowerCase()))) {
            return;
          }
        }

        const boost = calculateExactBoost(m.name ?? "", trimmed, parsed.nameTokens);
        const skillsList = m.skills ?? [];
        const bioSnippet = m.bio?.trim() || m.availability_note?.trim() || (skillsList.length > 0 ? `Experienced student mentor specializing in ${skillsList.slice(0, 4).join(", ")}. Available for 1-on-1 guidance, course preparation, and project reviews.` : "Senior student mentor at SRM-AP available for peer learning and academic guidance.");

        const sitelinks: SearchSitelink[] = [
          { label: "View Profile", to: `/mentor/${m.id}` },
        ];
        if (skillsList.length > 0) {
          sitelinks.push({ label: "Skills & Experience", to: `/mentor/${m.id}#skills` });
        }
        if (m.linkedin_url) {
          sitelinks.push({ label: "LinkedIn", to: m.linkedin_url, isExternal: true });
        }

        const mentorCategoryBoost = parsed.targetCategory === "mentors" ? 80 : 0;
        mentorMap.set(m.id, {
          id: m.id,
          title: m.name ?? "Mentor",
          subtitle: [m.department, skillsList.slice(0, 3).join(", ")].filter(Boolean).join(" · "),
          to: `/mentor/${m.id}`,
          image: m.profile_image,
          entityType: "mentor",
          badge: m.is_alumni ? "Alumni Mentor" : "Senior Mentor",
          breadcrumb: `friendlylearning.in › mentors › ${m.id.slice(0, 8)}`,
          snippet: bioSnippet,
          matchReason: skillsList.some(s => s.toLowerCase().includes(trimmed.toLowerCase())) ? `Matched skill: ${skillsList.filter(s => s.toLowerCase().includes(trimmed.toLowerCase())).join(", ")}` : (m.department ? `${m.department} · Available for Mentoring` : undefined),
          matchedTokens: parsed.tokens,
          sitelinks,
          meta: {
            rating: m.rating,
            review_count: m.review_count,
            department: m.department,
            skills: m.skills,
            year_of_studies: m.year_of_studies,
            graduation_year: m.graduation_year,
            company: m.company,
            job_title: m.job_title,
            is_available: m.is_available,
          },
          relevanceScore: 100 + boost * 50 + mentorCategoryBoost + getCtrBoost(m.id),
        });
      });

      // 2. Process Faculty (with exact name boost, department priority, and research snippets)
      // NOTE: idx is NOT used in relevanceScore — getFacultyList returns rating-sorted rows,
      // so -idx would bake in a rating bias. Instead we score purely on topical match.
      (facultyRes.data ?? []).forEach((f) => {
        const boost = calculateExactBoost(f.name, trimmed, parsed.nameTokens);
        let deptBoost = 0;
        if (parsed.detectedDepartment && f.department.toLowerCase().includes(parsed.detectedDepartment.toLowerCase())) {
          deptBoost = 200;
        }

        // Count how many query subject tokens appear in this faculty member's research interests.
        // This is the primary topical relevance signal — a faculty with 4 matched interests
        // ranks above one with only their department matching.
        const interestsList = [...(f.interests ?? []), ...(f.research_areas ?? [])];
        const interestText = interestsList.map((i) => i.toLowerCase()).join(" ");
        const interestMatchCount = parsed.filteredFacultyTokens.filter(
          (tok) => tok.length >= 3 && matchesWordBoundary(interestText, tok),
        ).length;
        const interestBoost = interestMatchCount * 40;

        const researchSnippet = f.research_details?.join(". ") || (interestsList.length > 0 ? `Research and subject expertise: ${interestsList.slice(0, 5).join(", ")}. Approaches in teaching and laboratory projects.` : `${f.designation || "Faculty Member"} in the Department of ${f.department} at SRM University-AP.`);

        const sitelinks: SearchSitelink[] = [
          { label: "Faculty Profile", to: `/faculty/${f.slug}` },
          { label: `Course Reviews (${f.rating_count || 0})`, to: `/faculty/${f.slug}#reviews` },
        ];
        if (interestsList.length > 0) {
          sitelinks.push({ label: "Research Interests", to: `/faculty/${f.slug}#interests` });
        }

        const matchedInterests = interestsList
          .filter((i) => parsed.filteredFacultyTokens.some((tok) => tok.length >= 3 && matchesWordBoundary(i, tok)))
          .slice(0, 2);

        const hasExactName = boost > 0;
        const hasDeptMatch = deptBoost > 0;
        const hasInterestMatch = interestMatchCount > 0;

        if (!hasExactName && !hasDeptMatch && !hasInterestMatch) {
          return;
        }

        let baseFacultyScore = 20;
        if (hasExactName) {
          baseFacultyScore = 150 + boost * 100;
        } else if (hasDeptMatch) {
          baseFacultyScore = 100 + deptBoost + interestBoost;
        } else if (hasInterestMatch) {
          baseFacultyScore = 70 + interestBoost;
        }

        const facultyCategoryPenalty = parsed.targetCategory === "mentors" ? -60 : (parsed.targetCategory === "faculty" ? 80 : 0);

        facultyMap.set(f.id, {
          id: f.id,
          title: f.name,
          subtitle: [f.designation, f.department].filter(Boolean).join(" · "),
          to: `/faculty/${f.slug}`,
          image: f.image_url,
          entityType: "faculty",
          badge: "Faculty & Research",
          breadcrumb: `friendlylearning.in › faculty › ${f.slug}`,
          snippet: researchSnippet,
          matchReason: matchedInterests.length > 0
            ? `Matched research area: ${matchedInterests.join(", ")}`
            : `Department of ${f.department}`,
          matchedTokens: parsed.tokens,
          sitelinks,
          meta: {
            avg_overall: f.avg_overall,
            rating_count: f.rating_count,
            department: f.department,
            designation: f.designation,
            school: f.school,
            office_location: f.office_location,
            interests: f.interests,
            research_areas: f.research_areas,
          },
          // Score: name-exact-match > department match > per-interest token match > weak generic match.
          // Rating never contributes to ordering here — see FACULTY_AI_ROADMAP.md red lines.
          relevanceScore: Math.max(10, baseFacultyScore + facultyCategoryPenalty) + getCtrBoost(f.id),
        });
      });

      // 3. Process Opportunities
      (oppRes.data ?? []).forEach((o, idx) => {
        const boost = calculateExactBoost(o.title, trimmed, parsed.tokens);
        const oppSnippet = o.description?.trim() || `Campus opportunity organized by ${o.organiser || "SRM-AP community"}. Connect with peers, form project teams, and apply.`;

        const sitelinks: SearchSitelink[] = [
          { label: "View Challenge", to: `/opportunities/${o.slug}` },
          { label: `Teammates (${o.team_count || 0} teams)`, to: `/opportunities/${o.slug}#teams` },
        ];
        if (o.external_url) {
          sitelinks.push({ label: "Official Link", to: o.external_url, isExternal: true });
        }

        oppMap.set(o.id, {
          id: o.id,
          title: o.title,
          subtitle: [o.kind ? o.kind.toUpperCase() : "OPPORTUNITY", o.organiser].filter(Boolean).join(" · "),
          to: `/opportunities/${o.slug}`,
          entityType: "opportunity",
          badge: o.kind ? o.kind.toUpperCase() : "OPPORTUNITY",
          breadcrumb: `friendlylearning.in › opportunities › ${o.slug}`,
          snippet: oppSnippet,
          matchReason: o.register_by ? `Register before ${new Date(o.register_by).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${o.interest_count || 0} interested` : `${o.interest_count || 0} students interested`,
          matchedTokens: parsed.tokens,
          sitelinks,
          meta: {
            kind: o.kind,
            organiser: o.organiser,
            register_by: o.register_by,
            interest_count: o.interest_count,
            team_count: o.team_count,
            tags: o.tags,
            is_online: o.is_online,
            location: o.location,
          },
          relevanceScore: 100 + boost * 50 + getCtrBoost(o.id),
        });
      });

      // 4. Process Posts
      (postRes.data ?? []).forEach((p, idx) => {
        const postSnippet = p.content ? (p.content.length > 200 ? `${p.content.slice(0, 200)}…` : p.content) : "Discussion on Friendly Learning campus board.";

        const sitelinks: SearchSitelink[] = [
          { label: "Read Discussion", to: `/posts/${p.id}` },
          { label: `Replies (${p.comments_count || 0})`, to: `/posts/${p.id}#comments` },
        ];

        const postText = `${p.title} ${p.content || ""}`;
        const postTopicalScore = parsed.specificTokens.filter(tok => 
          matchesWordBoundary(postText, tok)
        ).length * 30;
        const postEngagement = Math.log2(1 + (p.likes_count || 0) + (p.comments_count || 0) * 2) * 10;
        const postAgeDays = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const postFreshness = postAgeDays < 30 ? 20 : postAgeDays < 90 ? 10 : 0;

        postMap.set(p.id, {
          id: p.id,
          title: p.title,
          subtitle: `${p.author.name} · ${p.comments_count} ${p.comments_count === 1 ? "reply" : "replies"}`,
          to: `/posts/${p.id}`,
          image: p.image_url,
          entityType: "post",
          badge: p.post_type ? p.post_type.toUpperCase() : "CAMPUS POST",
          breadcrumb: `friendlylearning.in › posts › ${p.id.slice(0, 8)}`,
          snippet: postSnippet,
          matchReason: `Posted by ${p.author.name} · ${p.likes_count || 0} likes · ${p.comments_count || 0} replies`,
          matchedTokens: parsed.tokens,
          sitelinks,
          meta: {
            post_type: p.post_type,
            community: p.community,
            likes_count: p.likes_count,
            comments_count: p.comments_count,
            tags: p.tags,
            author: p.author,
            created_at: p.created_at,
          },
          relevanceScore: postTopicalScore + postEngagement + postFreshness + getCtrBoost(p.id),
        });
      });

      // 5. Process Communities
      (communityRes.data ?? []).forEach((c, idx) => {
        const kindMeta = getCommunityKindMeta(c.kind);
        const groupSnippet = c.description?.trim() || `A collaborative ${kindMeta.label.toLowerCase()} for SRM-AP students to share ideas, work on projects, and discuss coursework.`;

        const sitelinks: SearchSitelink[] = [
          { label: "Enter Group", to: `/workspace-groups/${c.slug}` },
          { label: "Discussions & Posts", to: `/workspace-groups/${c.slug}#discussions` },
          { label: "Group Chat", to: `/workspace-groups/${c.slug}#chat` },
        ];

        const commText = `${c.name} ${c.description || ""}`;
        const commTopicalScore = parsed.specificTokens.filter(tok =>
          matchesWordBoundary(commText, tok)
        ).length * 30;
        const commPopularity = Math.log2(1 + (c.member_count || 0)) * 15;
        const commAgeDays = c.last_activity_at ? (Date.now() - new Date(c.last_activity_at).getTime()) / (1000 * 60 * 60 * 24) : 999;
        const commActivity = commAgeDays < 7 ? 20 : commAgeDays < 30 ? 10 : 0;

        communityMap.set(c.id, {
          id: c.id,
          title: c.name,
          subtitle: `${kindMeta.label} · ${c.member_count} ${c.member_count === 1 ? "member" : "members"}`,
          to: `/workspace-groups/${c.slug}`,
          image: c.cover_image,
          entityType: "community",
          badge: kindMeta.label,
          breadcrumb: `friendlylearning.in › groups › ${c.slug}`,
          snippet: groupSnippet,
          matchReason: `${c.member_count} members · ${c.post_count || 0} discussions`,
          matchedTokens: parsed.tokens,
          sitelinks,
          meta: {
            kind: c.kind,
            member_count: c.member_count,
            post_count: c.post_count,
            description: c.description,
            visibility: c.visibility,
            last_activity_at: c.last_activity_at,
          },
          relevanceScore: commTopicalScore + commPopularity + commActivity + getCtrBoost(c.id),
        });
      });

      // 6. Seamlessly blend Semantic vector search hits
      if (semanticRes.data) {
        const semanticHits = allResults(semanticRes.data);
        semanticHits.forEach((hit) => {
          const simScore = (hit.similarity ?? 0.5) * 160;
          const similarity = hit.similarity ?? 0;

          if (hit.entity_type === "mentor") {
            if (parsed.detectedDepartment) {
              const dept = (hit.subtitle || "").toLowerCase();
              if (!dept.includes(parsed.detectedDepartment.toLowerCase())) return;
            }

            if (mentorMap.has(hit.entity_id)) {
              const existing = mentorMap.get(hit.entity_id)!;
              existing.relevanceScore = Math.max(existing.relevanceScore ?? 0, simScore + 80);
              existing.matchReason = "Matched via CampusMind AI semantic search";
            } else {
              // Mentor chunk metadata has: department, skills (array), profile_image, bio.
              const metaSkills = Array.isArray(hit.metadata?.skills)
                ? (hit.metadata.skills as string[]).filter((s): s is string => typeof s === "string")
                : [];
              const mentorBio = typeof hit.metadata?.bio === "string" ? hit.metadata.bio : "";
              const mentorCandidateText = `${hit.title} ${hit.subtitle ?? ""} ${metaSkills.join(" ")} ${mentorBio}`;

              // If query contains specific technical domain tokens, require topical match or high similarity (>= 0.58).
              // Prevents false semantic matches where generic phrasing ('ready to help juniors') matches 'anyone I can contact'.
              if (parsed.specificTokens.length > 0 && similarity < 0.58) {
                if (!hasTopicalMatch(mentorCandidateText, parsed)) {
                  return;
                }
              }

              const mentorPath = hit.source_path || `/mentor/${hit.entity_id}`;
              const mentorSnippet =
                mentorBio.trim()
                  ? mentorBio.trim()
                  : metaSkills.length > 0
                    ? `Experienced in ${metaSkills.slice(0, 4).join(", ")}. Available for peer learning, course guidance, and project mentoring at SRM-AP.`
                    : `Senior mentor at SRM-AP available for peer learning, course guidance, and project mentoring.`;

              mentorMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Mentor",
                to: mentorPath,
                image: typeof hit.metadata?.profile_image === "string" ? hit.metadata.profile_image : null,
                entityType: "mentor",
                badge: "Senior Mentor",
                breadcrumb: `friendlylearning.in › mentors › ${hit.entity_id.slice(0, 8)}`,
                snippet: mentorSnippet,
                matchReason: "Semantic match from CampusMind knowledge graph",
                sitelinks: [
                  { label: "View Profile", to: mentorPath },
                  { label: "Skills & Experience", to: `${mentorPath}#skills` },
                ],
                meta: hit.metadata,
                relevanceScore: simScore + 60 + getCtrBoost(hit.entity_id),
              });
            }
          } else if (hit.entity_type === "faculty") {
            if (parsed.detectedDepartment) {
              const dept = (hit.subtitle || "").toLowerCase();
              if (!dept.includes(parsed.detectedDepartment.toLowerCase())) return;
            }

            if (facultyMap.has(hit.entity_id)) {
              const existing = facultyMap.get(hit.entity_id)!;
              const catBonus = parsed.targetCategory === "mentors" ? 0 : 50;
              existing.relevanceScore = Math.max(existing.relevanceScore ?? 0, simScore + catBonus);
              existing.matchReason = "Matched via CampusMind AI semantic search";
            } else {
              const metaInterests = Array.isArray(hit.metadata?.interests)
                ? (hit.metadata.interests as string[]).filter((s): s is string => typeof s === "string")
                : [];
              const facultyBio = typeof hit.metadata?.research_details === "string" ? hit.metadata.research_details : "";
              const facultyCandidateText = `${hit.title} ${hit.subtitle ?? ""} ${metaInterests.join(" ")} ${facultyBio}`;

              if (parsed.specificTokens.length > 0 && similarity < 0.58) {
                if (!hasTopicalMatch(facultyCandidateText, parsed)) {
                  return;
                }
              }

              const slug = typeof hit.metadata?.slug === "string" ? hit.metadata.slug : hit.entity_id;
              const facultyPath = hit.source_path || `/faculty/${slug}`;
              const facultySnippet = metaInterests.length > 0
                ? `Research and subject expertise: ${metaInterests.slice(0, 5).join(", ")}.`
                : `Faculty member at SRM University-AP. Teaching and research supervision.`;

              const catBonus = parsed.targetCategory === "mentors" ? -30 : 20;
              facultyMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Faculty",
                to: facultyPath,
                image: typeof hit.metadata?.image_url === "string" ? hit.metadata.image_url : null,
                entityType: "faculty",
                badge: "Faculty & Research",
                breadcrumb: `friendlylearning.in › faculty › ${slug}`,
                snippet: facultySnippet,
                matchReason: "Semantic match from CampusMind knowledge graph",
                sitelinks: [
                  { label: "Faculty Profile", to: facultyPath },
                  { label: "Student Reviews", to: `${facultyPath}#reviews` },
                ],
                meta: hit.metadata,
                relevanceScore: Math.max(10, simScore + catBonus) + getCtrBoost(hit.entity_id),
              });
            }
          } else if (hit.entity_type === "student") {
            if (!studentMap.has(hit.entity_id)) {
              const rawInterests = hit.metadata?.interests;
              const interestsArr = Array.isArray(rawInterests) ? rawInterests.filter((v): v is string => typeof v === "string") : [];
              const studentCandidateText = `${hit.title} ${hit.subtitle ?? ""} ${interestsArr.join(" ")}`;

              if (parsed.specificTokens.length > 0 && similarity < 0.58) {
                if (!hasTopicalMatch(studentCandidateText, parsed)) {
                  return;
                }
              }

              studentMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Student",
                to: hit.source_path || "#",
                image: typeof hit.metadata?.profile_image === "string" ? hit.metadata.profile_image : null,
                entityType: "student",
                badge: "Student",
                breadcrumb: `friendlylearning.in › students › ${hit.entity_id.slice(0, 8)}`,
                snippet: interestsArr.length > 0 ? `Student interested in ${interestsArr.slice(0, 4).join(", ")}. Active in campus learning community.` : "Student profile on Friendly Learning SRMAP.",
                matchReason: "Student with matching skills or interests",
                meta: hit.metadata,
                relevanceScore: simScore + getCtrBoost(hit.entity_id),
              });
            }
          } else if (hit.entity_type === "opportunity") {
            if (!oppMap.has(hit.entity_id)) {
              const oppSlug = typeof hit.metadata?.slug === "string" ? hit.metadata.slug : hit.entity_id;
              const oppDesc = typeof hit.metadata?.description === "string" ? hit.metadata.description : "";
              const oppCandidateText = `${hit.title} ${hit.subtitle ?? ""} ${oppDesc}`;

              if (parsed.specificTokens.length > 0 && similarity < 0.58) {
                if (!hasTopicalMatch(oppCandidateText, parsed)) {
                  return;
                }
              }

              oppMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Opportunity",
                to: hit.source_path || `/opportunities/${oppSlug}`,
                image: typeof hit.metadata?.image_url === "string" ? hit.metadata.image_url : null,
                entityType: "opportunity",
                badge: "Opportunity",
                breadcrumb: `friendlylearning.in › opportunities › ${oppSlug}`,
                snippet: oppDesc || "Campus hackathon and competition opportunity.",
                matchReason: "Relevant competition opportunity",
                sitelinks: [
                  { label: "View Challenge", to: `/opportunities/${oppSlug}` },
                  { label: "Find Teammates", to: `/opportunities/${oppSlug}#teams` },
                ],
                meta: hit.metadata,
                relevanceScore: simScore + getCtrBoost(hit.entity_id),
              });
            }
          } else if (hit.entity_type === "community") {
            if (!communityMap.has(hit.entity_id)) {
              const commDesc = typeof hit.metadata?.description === "string" ? hit.metadata.description : "";
              const commCandidateText = `${hit.title} ${hit.subtitle ?? ""} ${commDesc}`;

              if (parsed.specificTokens.length > 0 && similarity < 0.58) {
                if (!hasTopicalMatch(commCandidateText, parsed)) {
                  return;
                }
              }

              const path =
                hit.source_path?.replace("/communities/", "/workspace-groups/") ||
                `/workspace-groups/${hit.entity_id}`;
              const commSlug = path.split("/").pop() || hit.entity_id;
              communityMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Group",
                to: path,
                image: typeof hit.metadata?.cover_image === "string" ? hit.metadata.cover_image : null,
                entityType: "community",
                badge: "Student Group",
                breadcrumb: `friendlylearning.in › groups › ${commSlug}`,
                snippet: commDesc || "Campus student workspace group for collaborative learning.",
                matchReason: "Matched active student workspace",
                sitelinks: [
                  { label: "Enter Group", to: path },
                  { label: "Discussions", to: `${path}#discussions` },
                ],
                meta: hit.metadata,
                relevanceScore: simScore + getCtrBoost(hit.entity_id),
              });
            }
          } else if (hit.entity_type === "post") {
            if (!postMap.has(hit.entity_id)) {
              const postContent = typeof hit.metadata?.content === "string" ? hit.metadata.content : "";
              const postCandidateText = `${hit.title} ${hit.subtitle ?? ""} ${postContent}`;

              if (parsed.specificTokens.length > 0 && similarity < 0.58) {
                if (!hasTopicalMatch(postCandidateText, parsed)) {
                  return;
                }
              }

              const path = hit.source_path?.replace("/community-posts/", "/posts/") || `/posts/${hit.entity_id}`;
              postMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: hit.subtitle ?? "Post",
                to: path,
                image: typeof hit.metadata?.image_url === "string" ? hit.metadata.image_url : null,
                entityType: "post",
                badge: "Campus Post",
                breadcrumb: `friendlylearning.in › posts › ${hit.entity_id.slice(0, 8)}`,
                snippet: postContent || "Campus discussion post on Friendly Learning.",
                matchReason: "Relevant thread in community discussions",
                sitelinks: [
                  { label: "Read Discussion", to: path },
                ],
                meta: hit.metadata,
                relevanceScore: simScore + getCtrBoost(hit.entity_id),
              });
            }
          } else if (hit.entity_type === "document") {
            if (!documentMap.has(hit.entity_id)) {
              const docCategory = typeof hit.metadata?.category === "string" ? hit.metadata.category : "Campus Policy";
              const docPage = typeof hit.metadata?.page_number === "number" ? `Page ${hit.metadata.page_number}` : "";
              const docSnippet = hit.body
                ? (hit.body.length > 220 ? `${hit.body.slice(0, 220)}…` : hit.body)
                : typeof hit.metadata?.section_heading === "string"
                ? hit.metadata.section_heading
                : "Official SRM-AP campus document / academic policy.";
              const docSlug = typeof hit.metadata?.slug === "string" ? hit.metadata.slug : hit.entity_id;

              documentMap.set(hit.entity_id, {
                id: hit.entity_id,
                title: hit.title,
                subtitle: [docCategory, docPage].filter(Boolean).join(" · ") || hit.subtitle || "Official Document",
                to: hit.source_path || `/documents/${docSlug}`,
                entityType: "document",
                badge: docCategory.toUpperCase(),
                breadcrumb: `friendlylearning.in › documents › ${docSlug}`,
                snippet: docSnippet,
                matchReason: "Grounded in official SRM-AP campus documents",
                sitelinks: [
                  { label: "View Document", to: hit.source_path || `/documents/${docSlug}` },
                ],
                meta: hit.metadata,
                relevanceScore: simScore + 100 + getCtrBoost(hit.entity_id),
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
      const allDocumentsList = sortList(Array.from(documentMap.values()));

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

      const pagedDocuments =
        tab === "documents"
          ? allDocumentsList.slice(offset, offset + PAGE_SIZE)
          : allDocumentsList.slice(0, ALL_PREVIEW);

      const blogLimit = tab === "blog" ? PAGE_SIZE : ALL_PREVIEW;
      const blog = searchBlogLocally(parsed, blogLimit);

      const relevantFacultyList = allFacultyList.filter((f) => (f.relevanceScore ?? 0) > 30);

      const counts: SearchCounts = {
        mentors: allMentorsList.length,
        faculty: parsed.subjectTokens.length > 0 || parsed.detectedDepartment
          ? relevantFacultyList.length
          : Math.max((facultyRes as { total?: number }).total ?? 0, allFacultyList.length),
        opportunities: allOppList.length,
        communities: allCommunitiesList.length,
        posts: allPostsList.length,
        documents: allDocumentsList.length,
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
      } else if (tab === "documents") {
        total = counts.documents;
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
        documents: pagedDocuments,
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
