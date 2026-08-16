import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeInput } from "@/utils/input-sanitization";

type CommunityInsert = Database["public"]["Tables"]["communities"]["Insert"];
type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"];

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
  is_fresh?: boolean;
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
  "id, slug, title, organiser, kind, description, tags, location, is_online, starts_at, ends_at, register_by, external_url, team_min, team_max, interest_count, team_count, posted_by, created_at, is_fresh" as const;

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
export async function getOpportunities(
  options: {
    kind?: string;
    includeClosed?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { kind = "all", includeClosed = false, search = "", limit = 60, offset = 0 } = options;

  let request = supabase.from("opportunities").select(COLUMNS, { count: "exact" }).eq("is_published", true);

  if (kind !== "all") request = request.eq("kind", kind);
  if (!includeClosed) {
    request = request.or(`register_by.is.null,register_by.gte.${new Date().toISOString()}`);
  }

  const rawSearch = search.trim();
  if (rawSearch) {
    const { parseQuery } = await import("@/lib/search/query-engine");
    const parsed = parseQuery(rawSearch);
    const escaped = `"%${rawSearch.replace(/"/g, '\\"')}%"`;

    const filters = [
      `title.ilike.${escaped}`,
      `organiser.ilike.${escaped}`,
      `description.ilike.${escaped}`,
    ];

    parsed.tokens.forEach((token) => {
      if (token.length >= 2) {
        const esc = `"%${token.replace(/"/g, '\\"')}%"`;
        filters.push(`title.ilike.${esc}`, `tags.cs.{${token}}`);
      }
    });

    request = request.or(filters.join(","));
  }

  const { data, error, count } = await request
    // @ts-expect-error PostgREST supports computed columns for ordering
    .order("is_fresh", { ascending: false, nullsLast: true })
    .order("register_by", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching opportunities:", error);
    return { data: [] as Opportunity[], total: 0, error };
  }

  return { data: (data ?? []) as unknown as Opportunity[], total: count ?? 0, error: null };
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

  return { data: (data as unknown as Opportunity | null) ?? null, error: null };
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

export type NewOpportunity = {
  title: string;
  organiser: string;
  kind: OpportunityKind;
  description: string;
  tags: string[];
  isOnline: boolean;
  location: string;
  registerBy: string;
  externalUrl: string;
  teamMin: string;
  teamMax: string;
};

/**
 * Post an opportunity. Open to any signed-in student, not just admins.
 *
 * The deliberate choice is that whoever spots the hackathon can list it, because
 * the person who finds one first is a student and not the site owner, and a
 * queue that only one person can clear is the thing that makes a listings page
 * go stale. Three guards make that safe, and all three live in the database
 * rather than here, so they hold no matter what calls the table:
 *
 *   - RLS restricts INSERT to `auth.uid() = posted_by`, so nobody can post as
 *     somebody else, and only the poster or an admin can edit or delete it.
 *   - A trigger caps a non-admin at five posts a day.
 *   - `slug` is derived server-side, so two people posting the same hackathon
 *     get `-2` rather than a unique-violation.
 *
 * `external_url` is the only field that leaves the site, so it is restricted to
 * http(s) here — a `javascript:` URL rendered into an anchor on a public page is
 * the one input on this form that could hurt a reader rather than just look
 * wrong.
 */
export async function createOpportunity(input: NewOpportunity) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { data: null, error: new Error("Sign in to post an opportunity") };

  const title = sanitizeInput(input.title, 140).trim();
  if (title.length < 4) return { data: null, error: new Error("Give it a title") };

  let externalUrl: string | null = null;
  const rawUrl = input.externalUrl.trim();
  if (rawUrl) {
    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    } catch {
      return { data: null, error: new Error("That registration link is not a valid URL") };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { data: null, error: new Error("The registration link must start with http or https") };
    }
    externalUrl = parsed.toString();
  }

  const toCount = (value: string) => {
    const parsedCount = Number.parseInt(value, 10);
    return Number.isFinite(parsedCount) && parsedCount > 0 ? Math.min(parsedCount, 100) : null;
  };

  // `slug` is left off entirely: opportunities_set_slug derives it from the
  // title before insert and resolves collisions with a suffix. The generated
  // types cannot see the trigger and insist on it, hence the cast — the same
  // reasoning as createTeam() below.
  const row = {
    title,
    organiser: input.organiser.trim() ? sanitizeInput(input.organiser, 120) : null,
    kind: input.kind,
    description: input.description.trim() ? sanitizeInput(input.description, 2000) : null,
    tags: input.tags.slice(0, 10).map((tag) => sanitizeInput(tag, 40)).filter(Boolean),
    is_online: input.isOnline,
    location: !input.isOnline && input.location.trim() ? sanitizeInput(input.location, 120) : null,
    // A date input gives a bare day. Registration almost always closes at the
    // end of that day, so it is stored as the day's last moment rather than
    // midnight — otherwise a deadline of "the 15th" disappears on the 14th.
    register_by: input.registerBy ? new Date(`${input.registerBy}T23:59:59`).toISOString() : null,
    external_url: externalUrl,
    team_min: toCount(input.teamMin),
    team_max: toCount(input.teamMax),
    posted_by: auth.user.id,
  } as OpportunityInsert;

  const { data, error } = await supabase
    .from("opportunities")
    .insert(row)
    .select("slug, title")
    .single();

  if (error) {
    console.error("Error posting opportunity:", error);
    // The rate limit raises check_violation with a message written for a
    // student. Anything else gets a generic line rather than raw Postgres.
    const friendly = error.message?.includes("posted 5 opportunities")
      ? error.message
      : "Could not post that. Check the fields and try again.";
    return { data: null, error: new Error(friendly) };
  }

  return { data, error: null };
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
