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
  userId: string;
  name: string;
  email: string | null;
  profileImage: string | null;
  department: string | null;
  approvedAt: string | null;
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
export async function listMentorWelcomeStatus(): Promise<{
  rows: MentorWelcomeStatus[];
  byId: WelcomeStatusMap;
  error: { message: string } | null;
}> {
  const { data, error } = await rpc("admin_list_mentor_welcome_status");

  if (error) {
    // Empty rather than a throw: the tracking migration is applied separately,
    // and a missing RPC should cost the welcome column, not the whole screen.
    // The error is returned so a dedicated page can explain itself instead of
    // rendering an empty list that looks like "no mentors".
    console.error("Could not read mentor welcome status:", error);
    return { rows: [], byId: new Map(), error };
  }

  const rows = ((data ?? []) as {
    user_id: string;
    name: string | null;
    email: string | null;
    profile_image: string | null;
    department: string | null;
    approved_at: string | null;
    sent_at: string | null;
    welcomed: boolean;
  }[]).map<MentorWelcomeStatus>((row) => ({
    userId: row.user_id,
    name: row.name ?? "A mentor",
    email: row.email,
    profileImage: row.profile_image,
    department: row.department,
    approvedAt: row.approved_at,
    sentAt: row.sent_at,
    welcomed: row.welcomed,
  }));

  return { rows, byId: new Map(rows.map((row) => [row.userId, row])), error: null };
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
