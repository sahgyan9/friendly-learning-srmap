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
  email?: string | null;
  office_location?: string | null;
  research_details?: string[] | null;
  /** Research interests, synced from the university directory. Often empty. */
  interests: string[];
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

export type FacultySort = "rating" | "reviews" | "name";

export type FacultyQuery = {
  search?: string;
  department?: string;
  /** Exact interest tag, as clicked from a chip. Distinct from free-text search. */
  interest?: string;
  sort?: FacultySort;
  limit?: number;
  offset?: number;
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
  "id, slug, name, designation, department, school, profile_url, image_url, email, office_location, research_details, interests, research_areas, rating_count, avg_overall, avg_teaching, avg_grading, avg_helpfulness" as const;

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
    sort = "rating",
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

  if (search.trim()) {
    const term = escapeOrValue(`%${search.trim()}%`);
    request = request.or(
      `name.ilike.${term},department.ilike.${term},designation.ilike.${term},interests_text.ilike.${term}`,
    );
  }

  if (sort === "name") {
    request = request
      .order("image_url", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });
  } else if (sort === "reviews") {
    request = request
      .order("image_url", { ascending: false, nullsFirst: false })
      .order("rating_count", { ascending: false })
      .order("name", { ascending: true });
  } else {
    // Default: highest rated first; unrated last; no-image last within each group.
    request = request
      .order("rating_count", { ascending: false })
      .order("avg_overall", { ascending: false })
      .order("image_url", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });
  }

  const { data, error, count } = await request.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching faculty:", error);
    return { data: [] as Faculty[], total: 0, error };
  }

  return { data: (data ?? []) as Faculty[], total: count ?? 0, error: null };
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
    .order("rating_count", { ascending: false })
    .order("image_url", { ascending: false, nullsFirst: false })
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

