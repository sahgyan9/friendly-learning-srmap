
import { supabase } from '../client';
import type { Mentor } from '@/types/mentor';
import type { MentorActivity } from '@/lib/mentor-activity';

/**
 * Mirrors public.mentor_is_listed. A pause whose deadline has passed is over.
 *
 * Kept as a shared helper because the same rule is needed by the query filter,
 * the card and the profile banner, and three hand-rolled copies of it are three
 * chances for a mentor to be hidden in one place and visible in another.
 */
export function isMentorListed(
  mentor: Pick<Mentor, 'is_available' | 'available_from'>,
): boolean {
  if (mentor.is_available !== false) return true;
  return !!mentor.available_from && new Date(mentor.available_from) <= new Date();
}

/**
 * Excludes paused mentors from a directory query.
 *
 * The second clause is not redundant: a cron job relists people every 15
 * minutes, so between the deadline passing and the sweep running the row still
 * reads `is_available = false`. Someone whose pause expired two minutes ago
 * should already be back, not waiting on a scheduler.
 */
const listedOnly = <T extends { or: (filter: string) => T }>(query: T): T =>
  query.or(`is_available.eq.true,available_from.lte.${new Date().toISOString()}`);

/**
 * Every mentor column except `mobile` and `cgpa`.
 *
 * Those two are personal data and are no longer readable by signed-out
 * visitors at the database level, so asking for `*` here would make the whole
 * directory fail for anyone who is not logged in.
 *
 * Must stay one string literal so supabase-js can infer the row type.
 */
// DEPLOY ORDER, if you are adding a column to this list: apply the migration
// to the database FIRST, then push. Vercel builds on push but migrations do
// not, so naming a column production does not have yet makes PostgREST reject
// the whole statement with 42703 -- not just that column -- taking down the
// directory and every mentor profile. That happened once (a0f6b2a, reverted in
// 5bf976a); the summary columns below were only added back after
// 20260823190000_mentor_profile_summary.sql was confirmed live.
const MENTOR_PUBLIC_COLUMNS =
  'id, slug, name, department, skills, rating, profile_image, linkedin_url, bio, review_count, created_at, year_of_studies, university, hobbies, graduation_year, is_alumni, company, job_title, is_available, available_from, availability_note, projects, experiences, courses, tagline, outcomes, ideal_mentees, ask_me_anything, profile_summary_generated_at, profile_summary_edited_at' as const;

// Helper function to get typed data from Supabase tables
export async function getMentors() {
  // listedOnly's self-referential generic constraint has to structurally verify
  // the whole query builder type against itself; with `projects`/`experiences`
  // now in the selected columns that recursion exceeds tsc's instantiation
  // depth. Pinning T explicitly skips that inference — Mentor is already
  // supplied to select() above it, so the returned data stays properly typed.
  const { data, error } = await listedOnly<any>(
    supabase
      .from('mentors')
      .select<typeof MENTOR_PUBLIC_COLUMNS, Mentor>(MENTOR_PUBLIC_COLUMNS)
      .neq('department', 'General')
      .not('department', 'is', null),
  ).order('rating', { ascending: false });

  return { data, error } as { data: Mentor[] | null; error: unknown };
}

export async function addMentor(mentor: {
  name: string;
  department: string;
  skills: string[];
  rating: number;
  profile_image: string;
  linkedin_url?: string;
  bio?: string;
  review_count?: number;
}) {
  return supabase
    .from('mentors')
    .insert([mentor]);
}

export async function searchMentors(query: string) {
  // If empty query, just return all mentors (excluding General)
  if (!query || !query.trim()) {
    return getMentors();
  }

  const trimmed = query.trim();
  const lowerQuery = trimmed.toLowerCase();

  try {
    // Fetch all active, listed mentors to ensure skills array and all metadata are searchable without SQL exclusion bugs
    const { data, error } = await getMentors();
    if (error || !data) {
      throw error || new Error("Failed to fetch mentors");
    }

    const { parseQuery, fuzzyMatchTokens, calculateExactBoost, matchesWordBoundary, hasTopicalMatch } = await import("@/lib/search/query-engine");
    const parsed = parseQuery(trimmed);

    // Score and filter each mentor
    const scoredMentors = data
      .map((mentor) => {
        const name = mentor.name ?? "";
        const dept = mentor.department ?? "";
        const skills = (mentor.skills ?? []).map((s) => s.toLowerCase());
        const skillsText = skills.join(" ");
        const bio = (mentor.bio ?? "").toLowerCase();
        const hobbies = (mentor.hobbies ?? "").toLowerCase();
        const combined = `${name.toLowerCase()} ${dept.toLowerCase()} ${skillsText} ${bio} ${hobbies}`;

        // If department was explicitly specified in query and mentor doesn't match department or skills, skip
        if (parsed.detectedDepartment) {
          const deptMatch = dept.toLowerCase().includes(parsed.detectedDepartment.toLowerCase());
          const skillMatch = skills.some((s) => s.includes(parsed.detectedDepartment!.toLowerCase()));
          if (!deptMatch && !skillMatch) {
            return { mentor, score: 0 };
          }
        }

        // Topical match requirement: if query has specific domain tokens (e.g. "qubit"), mentor MUST satisfy topical match.
        // Prevents matching only generic words like "design" in "API design" when query is "qubit design".
        const exactBoost = calculateExactBoost(name, lowerQuery, parsed.nameTokens);
        if (exactBoost === 0 && !hasTopicalMatch(combined, parsed)) {
          return { mentor, score: 0 };
        }

        let score = 0;

        // 1. Exact name boost
        if (exactBoost > 0) score += exactBoost * 100;

        // 2. Direct skill match on search subject tokens
        const hasDirectSkill = skills.some((s) =>
          parsed.subjectTokens.some((tok) => matchesWordBoundary(s, tok)),
        );
        if (hasDirectSkill) score += 80;

        // 3. Department match
        if (parsed.detectedDepartment && dept.toLowerCase().includes(parsed.detectedDepartment.toLowerCase())) {
          score += 60;
        }

        // 4. Token match across subject tokens
        const tokenMatches = parsed.subjectTokens.filter((token) => matchesWordBoundary(combined, token));
        score += tokenMatches.length * 30;

        // 5. Expanded department phrases
        if (parsed.expandedPhrases.some((phrase) => dept.toLowerCase().includes(phrase) || skillsText.includes(phrase))) {
          score += 35;
        }

        // 6. Typo corrected query match
        if (parsed.suggestedQuery) {
          const correctedTokens = parsed.suggestedQuery.split(" ");
          if (fuzzyMatchTokens(combined, correctedTokens)) {
            score += 15;
          }
        }

        return { mentor, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.mentor.rating ?? 0) - (a.mentor.rating ?? 0);
      });

    return { data: scoredMentors.map((item) => item.mentor), error: null };
  } catch (err) {
    console.error("searchMentors error:", err);
    return { data: null, error: err };
  }
}

/**
 * Pause or resume the caller's own listing.
 *
 * Goes through the RPC rather than writing the three columns, because the
 * deadline and the master switch have to move together: setting `is_available`
 * by hand and forgetting `available_from` is how "pause for 7 days" becomes a
 * disappearance nobody remembers agreeing to.
 *
 * @param days 1..365 while pausing; null means "until I turn it back on".
 *             Ignored when resuming.
 */
export async function setMentorAvailability(
  available: boolean,
  days: number | null,
  note: string | null,
) {
  const { data, error } = await supabase
    .rpc('set_mentor_availability', {
      p_available: available,
      p_days: available ? null : days,
      p_note: available ? null : note,
    })
    .single();

  return { data, error };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Get a single mentor by ID or slug. Deliberately unfiltered: a paused mentor's own
// profile, and every link anyone has already shared, must keep resolving.
export async function getMentorById(idOrSlug: string) {
  const isUuid = UUID_REGEX.test(idOrSlug);
  const query = supabase
    .from('mentors')
    .select<typeof MENTOR_PUBLIC_COLUMNS, Mentor>(MENTOR_PUBLIC_COLUMNS);

  const { data, error } = isUuid
    ? await query.eq('id', idOrSlug).maybeSingle()
    : await query.eq('slug', idOrSlug).maybeSingle();

  return { data, error };
}

export const getMentorByIdOrSlug = getMentorById;

/** The subset of a mentor that the profile page lets its owner edit in place. */
export type EditableMentorFields = Partial<
  Pick<
    Mentor,
    'name' | 'bio' | 'skills' | 'department' | 'university' | 'hobbies' | 'linkedin_url' | 'projects' | 'experiences'
  >
>;

/**
 * Columns that exist on `mentors` but not on `users`. Everything else has to be
 * written to both, because the two tables hold their own copies and the app
 * reads the mentor grid from one and the account pages from the other. Saving
 * only `mentors` is how a name ends up correct on a profile and stale in chat.
 */
const MENTOR_ONLY_FIELDS = new Set(['university', 'hobbies', 'projects', 'experiences']);

/**
 * Save an inline edit from the mentor's own profile page.
 *
 * `mentors` is written first and is the one that decides success: it is the row
 * this page and the mentor grid both read, so if it is rejected there is
 * nothing to show and the caller must be told the edit failed. Doing it in this
 * order also means a rejection leaves *both* tables untouched, rather than
 * leaving `users` silently ahead of what the profile displays.
 *
 * The `users` mirror is then best-effort, matching what UserProfile already
 * does — a failure there is logged but does not cost the user an edit that is
 * already live on their profile.
 */
export async function updateMentorFields(id: string, fields: EditableMentorFields) {
  const { data, error } = await supabase
    .from('mentors')
    .update({ ...fields })
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error };

  const userPatch = Object.fromEntries(
    Object.entries(fields).filter(([key]) => !MENTOR_ONLY_FIELDS.has(key)),
  );

  if (Object.keys(userPatch).length > 0) {
    // Only ever contains university/hobbies-shaped strings at runtime — MENTOR_ONLY_FIELDS
    // already filtered out projects/experiences above. Object.fromEntries widens the value
    // type to the full EditableMentorFields union though, which is more than Supabase's
    // strict update() typing will structurally match against `users`.
    const { error: userError } = await supabase.from('users').update(userPatch as never).eq('id', id);
    if (userError) {
      console.error('Mentor profile saved, but the users mirror was not updated:', userError);
    }
  }

  return { data, error: null };
}

export type EditableSummaryFields = Partial<
  Pick<Mentor, 'tagline' | 'outcomes' | 'ideal_mentees' | 'ask_me_anything'>
>;

/**
 * Save a mentor's hand-edit of their profile summary.
 *
 * Separate from updateMentorFields for two reasons. These columns exist only on
 * `mentors`, so there is no `users` mirror to keep in step. And every write here
 * has to stamp profile_summary_edited_at, which is what tells
 * generate-mentor-summary to leave this row alone from now on — without it the
 * next sweep would quietly replace whatever the mentor just corrected, which is
 * the one failure this whole feature cannot afford.
 *
 * Note the flag is row-level, not per-field: correcting only the tagline also
 * freezes the lists. That is deliberate. Someone who has started fixing our
 * wording should not find a different part of it rewritten underneath them, and
 * the UI says as much once the flag is set.
 */
export async function updateMentorSummary(id: string, fields: EditableSummaryFields) {
  const editedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('mentors')
    .update({ ...fields, profile_summary_edited_at: editedAt } as never)
    .eq('id', id)
    .select(MENTOR_PUBLIC_COLUMNS)
    .single();

  if (error) return { data: null, error, editedAt };
  return { data, error: null, editedAt };
}

export interface MentorDashboardStats extends MentorActivity {
  profile_views_30d: number;
  profile_views_prev30: number;
  search_clicks_30d: number;
}

/**
 * The signed-in mentor's own stats for their dashboard.
 *
 * Takes no id: the RPC keys off auth.uid(), so there is no parameter a caller
 * could point at somebody else's numbers.
 */
export async function getMentorDashboardStats() {
  const { data, error } = await supabase.rpc('mentor_dashboard_stats' as never);
  if (error) return { data: null, error };

  const rows = (data ?? []) as MentorDashboardStats[];
  return { data: rows[0] ?? null, error: null };
}

/**
 * Record that someone looked at a mentor's profile.
 *
 * Fire-and-forget: a visitor must never see an error, or a slower page, because
 * an analytics write failed. Signed-in repeat views are deduped per day by the
 * database; anonymous ones are deduped here, per browser session, because there
 * is no identity to key on server-side.
 */
export function logMentorProfileView(mentorId: string): void {
  if (!mentorId) return;

  const key = `mpv:${mentorId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Private mode or blocked storage. Fall through and log it — an occasional
    // double-count is a better failure than losing the signal entirely.
  }

  void supabase
    .rpc('log_mentor_profile_view' as never, { p_mentor_id: mentorId } as never)
    .then(({ error }) => {
      if (error) console.debug('profile view not recorded:', error.message);
    });
}

/**
 * Real reply statistics for one mentor, from conversations that happened.
 *
 * Returns null rather than zeroes when the row is missing, so the caller can
 * tell "this mentor has no track record" apart from "we could not load it" --
 * they read very differently on a profile, and the old code could express
 * neither because it invented the numbers.
 */
export async function getMentorActivity(mentorId: string) {
  const { data, error } = await supabase
    .rpc('mentor_activity' as never, { p_user_id: mentorId } as never);

  if (error) return { data: null, error };

  // Postgres set-returning function: supabase-js hands back an array. It is
  // empty (not null) for a uuid that is not a mentor — mentor_activity's guard
  // returns no row rather than a zeroed one.
  const rows = (data ?? []) as MentorActivity[];
  return { data: rows[0] ?? null, error: null };
}
