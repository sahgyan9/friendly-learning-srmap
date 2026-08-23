import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";

export type Faculty = {
  id: string;
  slug: string;
  name: string;
  designation: string | null;
  department: string;
  school: string | null;
  profile_url: string | null;
  image_url: string | null;
  has_image?: boolean | null;
  email?: string | null;
  office_location?: string | null;
  research_details?: string[] | null;
  /** Research interests, synced from the university directory. Often empty. */
  interests: string[];
  interests_text?: string | null;
  research_areas: string[];
  rating_count: number;
  avg_overall: number;
  avg_teaching: number;
  avg_grading: number;
  avg_helpfulness: number;
};

/**
 * A review as shown publicly. There is deliberately no author field: the RPC
 * that returns these never selects reviewer_id, so a review cannot be traced
 * back to a student even by reading the network response.
 */
export type FacultyReview = {
  id: string;
  teaching: number;
  grading: number;
  helpfulness: number;
  overall: number;
  comment: string | null;
  course_code: string | null;
  tags: string[] | null;
  helpful_count: number;
  viewer_voted: boolean;
  is_own: boolean;
  created_at: string;
};

export type FacultyRatingInput = {
  teaching: number;
  grading: number;
  helpfulness: number;
  comment?: string;
  courseCode?: string;
  tags?: string[];
};

export type FacultySort = "name" | "reviews";

export type FacultyQuery = {
  search?: string;
  department?: string;
  /** Exact interest tag, as clicked from a chip. Distinct from free-text search. */
  interest?: string;
  sort?: FacultySort;
  limit?: number;
  offset?: number;
};

export type FacultyRatingAggregate = {
  faculty_id: string;
  rating_count: number;
  avg_overall: number;
  avg_teaching: number;
  avg_grading: number;
  avg_helpfulness: number;
};

export type FacultyDepartmentCount = {
  department: string;
  count: number;
};

export type FacultyInterestFacet = {
  tag: string;
  count: number;
};

/** The three things students actually argue about, in a fixed order. */
export const RATING_CRITERIA = [
  {
    key: "teaching" as const,
    label: "Teaching quality",
    hint: "Are the lectures clear and worth attending?",
  },
  {
    key: "grading" as const,
    label: "Grading fairness",
    hint: "Are marks predictable and fairly awarded?",
  },
  {
    key: "helpfulness" as const,
    label: "Helpfulness",
    hint: "Are they approachable outside class?",
  },
];

/** Fixed vocabulary keeps the tag cloud useful instead of a free-text mess. */
export const REVIEW_TAGS = [
  "Clear lectures",
  "Tough grader",
  "Lenient grader",
  "Helpful in office hours",
  "Heavy workload",
  "Attendance matters",
  "Great with doubts",
  "Exam oriented",
  "Project heavy",
  "Inspiring",
] as const;

// Must stay a single string literal: supabase-js resolves the row type from the
// select string at the type level, and a concatenated expression defeats that.
const FACULTY_COLUMNS =
  "id, slug, name, designation, department, school, profile_url, image_url, has_image, office_location, research_details, interests, research_areas, rating_count, avg_overall, avg_teaching, avg_grading, avg_helpfulness" as const;

/**
 * PostgREST's .or() takes a comma-separated filter list, so a search term
 * containing a comma would be read as two filters. Parentheses delimit values
 * the same way, and a backslash escapes the quote character. Quoting the value
 * and escaping what can break out of the quotes keeps a term like
 * "machine learning, vision" a single filter.
 */
function escapeOrValue(term: string): string {
  return `"${term.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export async function getFacultyList(query: FacultyQuery = {}) {
  const {
    search = "",
    department = "all",
    interest = "",
    sort = "name",
    limit = 24,
    offset = 0,
  } = query;

  let request = supabase
    .from("faculty")
    .select(FACULTY_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  if (department !== "all") {
    request = request.eq("department", department);
  }

  // Exact tag match, served by the GIN index on interests. Kept separate from
  // the free-text search below so clicking "Machine Learning" cannot also drag
  // in every profile that merely mentions it inside a longer phrase.
  if (interest.trim()) {
    request = request.contains("interests", [interest.trim()]);
  }

  const rawSearch = search.trim();
  if (rawSearch) {
    const { parseQuery, STOP_WORDS, matchesWordBoundary } = await import("@/lib/search/query-engine");
    const parsed = parseQuery(rawSearch);

    // If query specified a department (e.g. "physics", "cse"), narrow to that department
    if (parsed.detectedDepartment && department === "all") {
      request = request.ilike("department", `%${parsed.detectedDepartment}%`);
    } else {
      const searchTerms = parsed.filteredFacultyTokens.filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
      const conditions: string[] = [];

      // Literal search matches name only — people recall faculty by name, not
      // by what's written in their interests list. Finding faculty by research
      // topic (e.g. "someone who knows machine learning") is handled by the
      // separate "interest" chip filter above and by semantic search, not by
      // free-text substring matching against interests_text.

      // 1. Direct full phrase match (only if phrase is reasonably short)
      if (rawSearch.length <= 40 && parsed.subjectTokens.length <= 3) {
        const fullTerm = escapeOrValue(`%${rawSearch}%`);
        conditions.push(`name.ilike.${fullTerm}`);
      }

      // If subjectTokens has multiple tokens (e.g. "qubit design"), also search for the combined phrase
      if (parsed.subjectTokens.length >= 2) {
        const subjectPhrase = escapeOrValue(`%${parsed.subjectTokens.join(" ")}%`);
        conditions.push(`name.ilike.${subjectPhrase}`);
      }

      // 2. Individual specific tokens (e.g. "qubit")
      if (searchTerms.length > 0) {
        searchTerms.forEach((token) => {
          const t = escapeOrValue(`%${token}%`);
          conditions.push(`name.ilike.${t}`);
        });
      }

      // 3. Expanded department phrases (only if explicit department found)
      if (parsed.detectedDepartment) {
        parsed.expandedPhrases.forEach((phrase) => {
          const p = escapeOrValue(`%${phrase}%`);
          conditions.push(`department.ilike.${p}`);
        });
      }

      if (conditions.length > 0) {
        request = request.or(conditions.join(","));
      }
    }
  }

  if (sort === "reviews") {
    request = request
      .order("has_image", { ascending: false })
      .order("rating_count", { ascending: false })
      .order("name", { ascending: true });
  } else {
    // Default: faculty with images first, alphabetical (never rank people by rating score)
    request = request
      .order("has_image", { ascending: false })
      .order("name", { ascending: true });
  }

  const { data, error, count } = await request.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching faculty:", error);
    return { data: [] as Faculty[], total: 0, error };
  }

  let facultyList = (data ?? []) as Faculty[];

  // If search was performed, sort results by match relevance
  if (rawSearch && facultyList.length > 0) {
    const { parseQuery, calculateExactBoost, matchesWordBoundary } = await import("@/lib/search/query-engine");
    const parsed = parseQuery(rawSearch);

    facultyList = [...facultyList].sort((a, b) => {
      // 1. Department match priority
      if (parsed.detectedDepartment) {
        const aDeptMatch = a.department.toLowerCase().includes(parsed.detectedDepartment.toLowerCase()) ? 1 : 0;
        const bDeptMatch = b.department.toLowerCase().includes(parsed.detectedDepartment.toLowerCase()) ? 1 : 0;
        if (bDeptMatch !== aDeptMatch) return bDeptMatch - aDeptMatch;
      }

      // 2. Exact name boost
      const aBoost = calculateExactBoost(a.name, rawSearch, parsed.nameTokens);
      const bBoost = calculateExactBoost(b.name, rawSearch, parsed.nameTokens);
      if (bBoost !== aBoost) return bBoost - aBoost;

      // 3. Specific token match count with word boundaries
      const aInterests = [...(a.interests ?? []), ...(a.research_areas ?? [])].join(" ").toLowerCase();
      const bInterests = [...(b.interests ?? []), ...(b.research_areas ?? [])].join(" ").toLowerCase();
      const aCombined = `${a.name} ${a.department} ${aInterests}`.toLowerCase();
      const bCombined = `${b.name} ${b.department} ${bInterests}`.toLowerCase();

      const aSpecificHits = parsed.filteredFacultyTokens.filter((tok) => matchesWordBoundary(aCombined, tok)).length;
      const bSpecificHits = parsed.filteredFacultyTokens.filter((tok) => matchesWordBoundary(bCombined, tok)).length;
      if (bSpecificHits !== aSpecificHits) return bSpecificHits - aSpecificHits;

      // 4. Rating count and rating score
      if (b.rating_count !== a.rating_count) return b.rating_count - a.rating_count;
      if ((b.avg_overall ?? 0) !== (a.avg_overall ?? 0)) return (b.avg_overall ?? 0) - (a.avg_overall ?? 0);

      // 5. Prefer faculty with images if relevance & ratings are tied
      const aHasImg = (a.has_image ?? (!!a.image_url && a.image_url.trim() !== "")) ? 1 : 0;
      const bHasImg = (b.has_image ?? (!!b.image_url && b.image_url.trim() !== "")) ? 1 : 0;
      if (bHasImg !== aHasImg) return bHasImg - aHasImg;

      return a.name.localeCompare(b.name);
    });
  }

  return { data: facultyList, total: count ?? 0, error: null };
}

export async function getFacultyBySlug(slug: string) {
  const { data, error } = await supabase
    .from("faculty")
    .select(FACULTY_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching faculty member:", error);
    return { data: null, error };
  }

  return { data: (data as Faculty | null) ?? null, error: null };
}

/** Distinct department list for the filter, derived from the synced directory. */
export async function getFacultyDepartments() {
  const { data, error } = await supabase
    .from("faculty")
    .select("department")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching departments:", error);
    return { data: [] as string[], error };
  }

  const departments = Array.from(new Set((data ?? []).map((row) => row.department)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return { data: departments, error: null };
}

/**
 * The interests shared by more than one faculty member, most common first.
 *
 * The directory carries ~1380 distinct interest terms across 590 people, but
 * most are used exactly once — listing them all would be a wall of noise. The
 * RPC filters to the ~200 that are actually shared, which are the only ones
 * worth offering as something to browse by.
 */
export async function getFacultyInterestFacets(limit = 40) {
  const { data, error } = await supabase.rpc("get_faculty_interest_facets", { p_limit: limit });

  if (error) {
    console.error("Error fetching interest facets:", error);
    return { data: [] as { interest: string; count: number }[], error };
  }

  return {
    data: (data ?? []).map((row) => ({ interest: row.interest, count: Number(row.faculty_count) })),
    error: null,
  };
}

export async function getFacultyReviews(facultyId: string) {
  const { data, error } = await supabase.rpc("get_faculty_reviews", { p_faculty_id: facultyId });

  if (error) {
    console.error("Error fetching faculty reviews:", error);
    return { data: [] as FacultyReview[], error };
  }

  return { data: (data ?? []) as FacultyReview[], error: null };
}

export async function getFacultyTagCounts(facultyId: string) {
  const { data, error } = await supabase.rpc("get_faculty_tag_counts", { p_faculty_id: facultyId });

  if (error) {
    console.error("Error fetching faculty tags:", error);
    return { data: [] as { tag: string; count: number }[], error };
  }

  return { data: (data ?? []).map((row) => ({ tag: row.tag, count: Number(row.count) })), error: null };
}

/** The caller's own rating, so the modal can open pre-filled for editing. */
export async function getMyFacultyRating(facultyId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: null };

  const { data, error } = await supabase
    .from("faculty_ratings")
    .select("id, teaching, grading, helpfulness, comment, course_code, tags")
    .eq("faculty_id", facultyId)
    .eq("reviewer_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching own rating:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Insert or update the caller's rating. Upsert on (faculty_id, reviewer_id) so a
 * student changing their mind updates rather than hitting a unique violation.
 */
export async function submitFacultyRating(facultyId: string, input: FacultyRatingInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { error: new Error("You need to be signed in to rate a faculty member") };
  }

  const clamp = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

  const { error } = await supabase.from("faculty_ratings").upsert(
    {
      faculty_id: facultyId,
      reviewer_id: auth.user.id,
      teaching: clamp(input.teaching),
      grading: clamp(input.grading),
      helpfulness: clamp(input.helpfulness),
      comment: input.comment?.trim() ? sanitizeInput(input.comment, 1000) : null,
      course_code: input.courseCode?.trim() ? sanitizeInput(input.courseCode, 32) : null,
      tags: (input.tags ?? []).slice(0, 6),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "faculty_id,reviewer_id" },
  );

  if (error) {
    console.error("Error submitting faculty rating:", error);
  }

  return { error };
}

export async function deleteMyFacultyRating(facultyId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Not signed in") };

  const { error } = await supabase
    .from("faculty_ratings")
    .delete()
    .eq("faculty_id", facultyId)
    .eq("reviewer_id", auth.user.id);

  return { error };
}

export async function toggleReviewHelpful(ratingId: string, currentlyVoted: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Sign in to vote"), voted: currentlyVoted };

  if (currentlyVoted) {
    const { error } = await supabase
      .from("faculty_review_votes")
      .delete()
      .eq("rating_id", ratingId)
      .eq("voter_id", auth.user.id);

    return { error, voted: false };
  }

  const { error } = await supabase
    .from("faculty_review_votes")
    .insert({ rating_id: ratingId, voter_id: auth.user.id });

  return { error, voted: true };
}

export async function getTopRatedFaculty(limit = 6, minRatings = 3) {
  const { data, error } = await supabase.rpc("get_top_rated_faculty", {
    p_limit: limit,
    p_min_ratings: minRatings,
  });

  if (error) {
    console.error("Error fetching top rated faculty:", error);
    return { data: [], error };
  }

  return { data: data ?? [], error: null };
}

export async function getFacultyDirectoryStats() {
  const { data, error } = await supabase.rpc("get_faculty_directory_stats");

  if (error) {
    return { data: { faculty_count: 0, rating_count: 0, department_count: 0 }, error };
  }

  const row = (data ?? [])[0];
  return {
    data: {
      faculty_count: Number(row?.faculty_count ?? 0),
      rating_count: Number(row?.rating_count ?? 0),
      department_count: Number(row?.department_count ?? 0),
    },
    error: null,
  };
}

/**
 * Retrieves similar faculty in the same department or research domain.
 */
export async function getSimilarFaculty(
  department: string,
  excludeId: string,
  limit = 3
) {
  let query = supabase
    .from("faculty")
    .select(FACULTY_COLUMNS)
    .eq("is_active", true)
    .neq("id", excludeId);

  if (department && department !== "General" && department !== "all") {
    query = query.eq("department", department);
  }

  query = query
    .order("has_image", { ascending: false })
    .order("rating_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching similar faculty:", error);
    return { data: [] as Faculty[], error };
  }

  return { data: (data ?? []) as Faculty[], error: null };
}

/**
 * Computes standard SRM-AP institutional email from faculty name/slug.
 * Standard directory pattern: firstname.initial@srmap.edu.in (or slug based)
 */
export function getFacultyEmail(faculty: { name: string; slug?: string; email?: string | null }): string {
  if (faculty.email && faculty.email.trim()) {
    return faculty.email.trim();
  }
  const cleanedName = faculty.name
    .replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "")
    .trim();
  const parts = cleanedName.split(/\s+/);
  if (parts.length >= 2) {
    const firstName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const lastInitial = parts[parts.length - 1][0].toLowerCase();
    return `${firstName}.${lastInitial}@srmap.edu.in`;
  }
  const cleanSlug = (faculty.slug || cleanedName)
    .replace(/^dr-?/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  return `${cleanSlug}@srmap.edu.in`;
}

/**
 * Resolves the official university directory profile URL on srmap.edu.in.
 */
export function getFacultyProfileUrl(faculty: { slug?: string; profile_url?: string | null }): string | null {
  if (faculty.profile_url && faculty.profile_url.trim()) {
    return faculty.profile_url.trim();
  }
  if (faculty.slug && faculty.slug.trim()) {
    return `https://www.srmap.edu.in/faculty/${faculty.slug.trim().replace(/^\/+|\/+$/g, "")}/`;
  }
  return null;
}

