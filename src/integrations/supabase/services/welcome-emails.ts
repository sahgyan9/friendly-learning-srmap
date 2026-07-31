import { supabase } from "../client";

/**
 * Both RPCs below are added by migration 20260731150000 and are therefore not
 * in `types.ts`, which is generated from the deployed schema. The cast is
 * confined to this file rather than hand-editing the generated types, which the
 * next regeneration would silently throw away.
 */
const rpc = supabase.rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export type MentorWelcomeStatus = {
  email: string | null;
  sentAt: string | null;
  welcomed: boolean;
};

/** Keyed by the mentor's user id. */
export type WelcomeStatusMap = Map<string, MentorWelcomeStatus>;

/**
 * Email address and welcome state for every approved mentor.
 *
 * The address comes from here rather than the verification query's own
 * `user:users(...)` join because RLS on public.users limits SELECT to the
 * caller's own row — that embed resolves to null for every applicant except
 * yourself, which is what put "No email on file" next to people who had one.
 *
 * "Welcomed" is the admin's confirmation, not an observation: the mail is sent
 * from their own client and nothing in the browser can watch that happen.
 */
export async function listMentorWelcomeStatus(): Promise<WelcomeStatusMap> {
  const { data, error } = await rpc("admin_list_mentor_welcome_status");

  if (error) {
    // An empty map rather than a throw: the tracking migration is applied
    // separately, and a missing RPC should cost the admin the welcome column,
    // not the whole verification screen.
    console.error("Could not read mentor welcome status:", error);
    return new Map();
  }

  const rows = (data ?? []) as {
    user_id: string;
    email: string | null;
    sent_at: string | null;
    welcomed: boolean;
  }[];

  return new Map(
    rows.map((row) => [
      row.user_id,
      { email: row.email, sentAt: row.sent_at, welcomed: row.welcomed },
    ]),
  );
}

export async function markMentorWelcomed(mentorId: string) {
  const { data, error } = await rpc("admin_mark_mentor_welcomed", {
    p_mentor_id: mentorId,
  });

  if (error) {
    console.error("Could not record the welcome:", error);
    return { data: null, error };
  }

  return { data: data as string | null, error: null };
}
