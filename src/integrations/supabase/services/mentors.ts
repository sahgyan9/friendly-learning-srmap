
import { supabase } from '../client';
import type { Mentor } from '@/types/mentor';

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

// Helper function to get typed data from Supabase tables
export async function getMentors() {
  const { data, error } = await listedOnly(
    supabase
      .from('mentors')
      .select('*')
      .neq('department', 'General')
      .not('department', 'is', null),
  ).order('rating', { ascending: false });

  return { data, error };
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

  const lowerQuery = query.toLowerCase().trim();

  try {
    // Search in name, department, and bio with proper formatting, excluding General department
    const { data, error } = await listedOnly(
      supabase
        .from('mentors')
        .select('*')
        .neq('department', 'General')
        .not('department', 'is', null)
        .or(`name.ilike.%${lowerQuery}%,department.ilike.%${lowerQuery}%,bio.ilike.%${lowerQuery}%`),
    ).order('rating', { ascending: false });

    if (error) {
      throw error;
    }

    // For skills array, we need to filter in JS since it's complex in SQL
    const mentorsWithMatchingSkills = data?.filter(mentor =>
      mentor.skills && mentor.skills.some(skill =>
        skill.toLowerCase().includes(lowerQuery)
      )
    ) || [];

    // Merge SQL results with JS filtered results for skills
    const mergedResults = [...(data || []), ...mentorsWithMatchingSkills];

    // Remove duplicates based on id
    const uniqueResults = Array.from(
      new Map(mergedResults.map(item => [item.id, item])).values()
    );

    return { data: uniqueResults, error: null };
  } catch (err) {
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

// Get a single mentor by ID. Deliberately unfiltered: a paused mentor's own
// profile, and every link anyone has already shared, must keep resolving.
export async function getMentorById(id: string) {
  const { data, error } = await supabase
    .from('mentors')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

/** The subset of a mentor that the profile page lets its owner edit in place. */
export type EditableMentorFields = Partial<
  Pick<Mentor, 'name' | 'bio' | 'skills' | 'department' | 'university' | 'hobbies' | 'linkedin_url'>
>;

/**
 * Columns that exist on `mentors` but not on `users`. Everything else has to be
 * written to both, because the two tables hold their own copies and the app
 * reads the mentor grid from one and the account pages from the other. Saving
 * only `mentors` is how a name ends up correct on a profile and stale in chat.
 */
const MENTOR_ONLY_FIELDS = new Set(['university', 'hobbies']);

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
    const { error: userError } = await supabase.from('users').update(userPatch).eq('id', id);
    if (userError) {
      console.error('Mentor profile saved, but the users mirror was not updated:', userError);
    }
  }

  return { data, error: null };
}
