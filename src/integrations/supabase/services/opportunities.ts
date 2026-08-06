import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeInput } from "@/utils/input-sanitization";

type CommunityInsert = Database["public"]["Tables"]["communities"]["Insert"];

export type OpportunityKind =
  | "hackathon"
  | "competition"
  | "internship"
  | "conference"
  | "scholarship"
  | "other";

export type Opportunity = {
  id: string;
  slug: string;
  title: string;
  organiser: string | null;
  kind: OpportunityKind;
  description: string | null;
  tags: string[];
  location: string | null;
  is_online: boolean;
  starts_at: string | null;
  ends_at: string | null;
  register_by: string | null;
  external_url: string | null;
  team_min: number | null;
  team_max: number | null;
  interest_count: number;
  team_count: number;
  posted_by: string | null;
  created_at: string;
};

/** A team, joined to the community that carries its members and chat. */
export type OpportunityTeam = {
  id: string;
  opportunity_id: string;
  community_id: string;
  looking_for: string[];
  pitch: string | null;
  is_open: boolean;
  created_by: string | null;
  community: {
    slug: string;
    name: string;
    description: string;
    member_count: number;
  } | null;
};

const COLUMNS =
  "id, slug, title, organiser, kind, description, tags, location, is_online, starts_at, ends_at, register_by, external_url, team_min, team_max, interest_count, team_count, posted_by, created_at" as const;

export const OPPORTUNITY_KINDS: { value: OpportunityKind; label: string }[] = [
  { value: "hackathon", label: "Hackathon" },
  { value: "competition", label: "Competition" },
  { value: "internship", label: "Internship" },
  { value: "conference", label: "Conference" },
  { value: "scholarship", label: "Scholarship" },
  { value: "other", label: "Other" },
];

/** Days until the deadline. Negative means closed. */
export function daysLeft(registerBy: string | null): number | null {
  if (!registerBy) return null;
  const ms = new Date(registerBy).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Open opportunities, soonest deadline first.
 *
 * Anything past its deadline is excluded rather than greyed out: the page
 * exists to answer "what can I still enter", and a closed listing is noise a
 * fresher has to read past. `register_by IS NULL` sorts last — undated things
 * are real but never urgent.
 */
export async function getOpportunities(options: { kind?: string; includeClosed?: boolean } = {}) {
  const { kind = "all", includeClosed = false } = options;

  let request = supabase.from("opportunities").select(COLUMNS).eq("is_published", true);

  if (kind !== "all") request = request.eq("kind", kind);
  if (!includeClosed) {
    request = request.or(`register_by.is.null,register_by.gte.${new Date().toISOString()}`);
  }

  const { data, error } = await request
    .order("register_by", { ascending: true, nullsFirst: false })
    .limit(60);

  if (error) {
    console.error("Error fetching opportunities:", error);
    return { data: [] as Opportunity[], error };
  }

  return { data: (data ?? []) as Opportunity[], error: null };
}

export async function getOpportunityBySlug(slug: string) {
  const { data, error } = await supabase
    .from("opportunities")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching opportunity:", error);
    return { data: null, error };
  }

  return { data: (data as Opportunity | null) ?? null, error: null };
}

/**
 * Teams for an opportunity, with the community that holds their members.
 * Open teams first — a closed team is context, an open one is an invitation.
 */
export async function getTeams(opportunityId: string) {
  const { data, error } = await supabase
    .from("opportunity_teams")
    .select(
      "id, opportunity_id, community_id, looking_for, pitch, is_open, created_by, community:communities(slug, name, description, member_count)",
    )
    .eq("opportunity_id", opportunityId)
    .order("is_open", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching teams:", error);
    return { data: [] as OpportunityTeam[], error };
  }

  return { data: (data ?? []) as unknown as OpportunityTeam[], error: null };
}

/** Whether the signed-in student has already raised a hand here. */
export async function getMyInterest(opportunityId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: null };

  const { data, error } = await supabase
    .from("opportunity_interest")
    .select("note, created_at")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error reading interest:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Raise a hand. Deliberately one tap with an optional note — the whole point is
 * that it costs less than joining a team, so a fresher who is not yet confident
 * still shows up in the count that makes the next person feel less alone.
 */
export async function setInterest(opportunityId: string, note?: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Sign in to show interest") };

  const { error } = await supabase.from("opportunity_interest").upsert(
    {
      opportunity_id: opportunityId,
      user_id: auth.user.id,
      note: note?.trim() ? sanitizeInput(note, 200) : null,
    },
    { onConflict: "opportunity_id,user_id" },
  );

  return { error };
}

export async function withdrawInterest(opportunityId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: new Error("Not signed in") };

  const { error } = await supabase
    .from("opportunity_interest")
    .delete()
    .eq("opportunity_id", opportunityId)
    .eq("user_id", auth.user.id);

  return { error };
}

/** Who else is in, so a student can see names rather than a number. */
export async function getInterestedPeople(opportunityId: string) {
  const { data, error } = await supabase
    .from("opportunity_interest")
    .select("user_id, note, created_at")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    // Expected when signed out — the policy restricts this to authenticated
    // users on purpose, so the list is not scrapeable.
    return { data: [] as { user_id: string; note: string | null }[], error };
  }

  return { data: data ?? [], error: null };
}

/**
 * Start a team.
 *
 * Creates the community first — that is what actually holds the members and the
 * chat — then joins it to the opportunity. The community's own triggers add the
 * creator as a member and derive the slug, so neither is done here.
 *
 * `description` has a 20-character minimum on communities, so the pitch is
 * padded with the opportunity title rather than failing a constraint check the
 * student cannot see.
 */
export async function createTeam(input: {
  opportunityId: string;
  opportunityTitle: string;
  name: string;
  pitch: string;
  lookingFor: string[];
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error("Sign in to start a team") };

  const pitch = input.pitch.trim();
  const description =
    pitch.length >= 20 ? pitch : `${pitch} — team for ${input.opportunityTitle}`.slice(0, 2000);

  // `slug` is NOT NULL with no default, so the generated types insist callers
  // supply it — they cannot see that communities_set_slug runs BEFORE INSERT and
  // overwrites whatever is passed. Same cast, and same reasoning, as
  // createCommunity() in communities.ts.
  const communityRow = {
    name: sanitizeInput(input.name, 80),
    description: sanitizeInput(description, 2000),
    // Not 'team': the communities kind check allows 'hackathon' and not 'team',
    // and reusing the existing value keeps these groups visible to every
    // feature that already filters on kind.
    kind: "hackathon",
    visibility: "private",
    owner_id: auth.user.id,
  } as CommunityInsert;

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .insert(communityRow)
    .select("id, slug, name")
    .single();

  if (communityError || !community) {
    console.error("Error creating team community:", communityError);
    return { data: null, error: communityError ?? new Error("Could not create the team") };
  }

  const { error: teamError } = await supabase.from("opportunity_teams").insert({
    opportunity_id: input.opportunityId,
    community_id: community.id,
    looking_for: input.lookingFor.slice(0, 8),
    pitch: sanitizeInput(pitch, 300),
    created_by: auth.user.id,
  });

  if (teamError) {
    console.error("Error linking team to opportunity:", teamError);
    return { data: null, error: teamError };
  }

  return { data: community, error: null };
}

/** Close the slot once the team is full. Any member may do this. */
export async function setTeamOpen(teamId: string, isOpen: boolean) {
  const { error } = await supabase
    .from("opportunity_teams")
    .update({ is_open: isOpen })
    .eq("id", teamId);

  return { error };
}
