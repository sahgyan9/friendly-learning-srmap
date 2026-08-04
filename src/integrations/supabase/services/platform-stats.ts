import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  mentors: number;
  faculty: number;
  departments: number;
  posts: number;
}

/**
 * Real counts for the homepage hero.
 *
 * The hero previously showed four hardcoded figures — 200+ mentors, a 4.8
 * average rating, 15 departments and 1000+ mentees helped — none of which came
 * from the database. The faculty card immediately below it reported the true
 * department count, so the page contradicted itself on a single screen.
 *
 * Counts use `head: true`, so Postgres returns the number without shipping any
 * rows.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [mentors, faculty, posts, directory] = await Promise.all([
    // Same filter getMentors() applies, so the headline count matches what a
    // visitor actually finds on /mentors. A raw table count reported 11 while
    // only one mentor was browsable.
    supabase
      .from("mentors")
      .select("id", { count: "exact", head: true })
      .neq("department", "General")
      .not("department", "is", null),
    supabase.from("faculty").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("community_posts").select("*", { count: "exact", head: true }),
    supabase.rpc("get_faculty_directory_stats"),
  ]);

  const departments = Number((directory.data ?? [])[0]?.department_count ?? 0);

  return {
    mentors: mentors.count ?? 0,
    faculty: faculty.count ?? 0,
    departments,
    posts: posts.count ?? 0,
  };
}
