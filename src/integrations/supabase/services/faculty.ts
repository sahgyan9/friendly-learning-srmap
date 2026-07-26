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
  "id, slug, name, designation, department, school, profile_url, image_url, rating_count, avg_overall, avg_teaching, avg_grading, avg_helpfulness" as const;

export async function getFacultyList(query: FacultyQuery = {}) {
  const { search = "", department = "all", sort = "rating", limit = 24, offset = 0 } = query;

  let request = supabase
    .from("faculty")
    .select(FACULTY_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  if (department !== "all") {
    request = request.eq("department", department);
  }

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    request = request.or(`name.ilike.${term},department.ilike.${term},designation.ilike.${term}`);
  }

  if (sort === "name") {
    request = request.order("name", { ascending: true });
  } else if (sort === "reviews") {
    request = request.order("rating_count", { ascending: false }).order("name", { ascending: true });
  } else {
    // Unrated faculty sort last so the top of the page is always useful.
    request = request
      .order("rating_count", { ascending: false })
      .order("avg_overall", { ascending: false })
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
