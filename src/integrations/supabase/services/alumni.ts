import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";

export type AlumniStatus = {
  /** Null until they tell us; only ever a suggestion from the College ID before then. */
  graduationYear: number | null;
  /** Set once they have confirmed they graduated. */
  confirmedAt: string | null;
  company: string | null;
  jobTitle: string | null;
  isMentor: boolean;
};

/**
 * The caller's own graduation and alumni state.
 *
 * Read from public.users rather than public.mentors: the mentors row is
 * world-readable and carries only what is safe to publish, while this needs the
 * private confirmation timestamp. RLS restricts users to the caller's own row,
 * so no filter beyond the id is required for correctness — it is there to make
 * the intent obvious.
 */
export async function getAlumniStatus(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("graduation_year, alumni_confirmed_at, company, job_title, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching alumni status:", error);
    return { data: null as AlumniStatus | null, error };
  }
  if (!data) return { data: null as AlumniStatus | null, error: null };

  return {
    data: {
      graduationYear: data.graduation_year,
      confirmedAt: data.alumni_confirmed_at,
      company: data.company,
      jobTitle: data.job_title,
      isMentor: data.role === "mentor" || data.role === "both",
    } as AlumniStatus,
    error: null,
  };
}

/**
 * Confirms the caller has graduated.
 *
 * Deliberately takes no user id — the RPC acts on auth.uid() only, so this
 * cannot be used to graduate somebody else. It updates users and mentors in one
 * call so the private state and the published badge cannot drift apart.
 */
export async function confirmAlumniStatus(input: {
  graduationYear?: number;
  company?: string;
  jobTitle?: string;
}) {
  const { error } = await supabase.rpc("confirm_alumni_status", {
    p_graduation_year: input.graduationYear ?? null,
    p_company: input.company?.trim() ? sanitizeInput(input.company, 120) : null,
    p_job_title: input.jobTitle?.trim() ? sanitizeInput(input.jobTitle, 120) : null,
  });

  if (error) console.error("Error confirming alumni status:", error);
  return { error };
}
