import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";

/**
 * Communities: groups a mentor starts and students join.
 *
 * Reads go through SECURITY DEFINER RPCs because every one of them needs the
 * owner's or a member's name, and public.users is owner-only readable by design.
 * Writes are plain table calls — the rules live in RLS, where they hold whoever
 * is calling and whatever the UI happens to render.
 */

export const COMMUNITY_KINDS = [
  { value: "hackathon", label: "Hackathon team", emoji: "⚡" },
  { value: "project", label: "Project group", emoji: "🛠️" },
  { value: "club", label: "Club or society", emoji: "🎭" },
  { value: "study", label: "Study group", emoji: "📚" },
  { value: "research", label: "Research group", emoji: "🔬" },
  { value: "general", label: "Something else", emoji: "💬" },
] as const;

export type CommunityKind = (typeof COMMUNITY_KINDS)[number]["value"];

export const NAME_MIN = 3;
export const NAME_MAX = 80;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;

export function getCommunityKindMeta(value: string) {
  return (
    COMMUNITY_KINDS.find((kind) => kind.value === value) ??
    COMMUNITY_KINDS[COMMUNITY_KINDS.length - 1]
  );
}

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  cover_image: string | null;
  member_count: number;
  post_count: number;
  is_archived: boolean;
  created_at: string;
  owner: { id: string; name: string; profile_image: string | null };
  viewer_is_member: boolean;
  viewer_is_owner: boolean;
  /** Only present from getCommunityBySlug. Members of a live group may post. */
  viewer_can_post?: boolean;
};

export type CommunityMember = {
  user_id: string;
  name: string;
  profile_image: string | null;
  role: string;
  is_mentor: boolean;
  joined_at: string;
};

export type CommunityListOptions = {
  search?: string;
  kind?: string;
  /** Only groups the signed-in viewer belongs to. */
  mine?: boolean;
  limit?: number;
  offset?: number;
};

type CommunityRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  cover_image: string | null;
  member_count: number;
  post_count: number;
  is_archived: boolean;
  created_at: string;
  owner_id: string;
  owner_name: string | null;
  owner_image: string | null;
  viewer_is_member: boolean;
  viewer_is_owner: boolean;
  viewer_can_post?: boolean;
  total_count?: number;
};

function toCommunity(row: CommunityRow): Community {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    kind: row.kind,
    cover_image: row.cover_image,
    member_count: row.member_count,
    post_count: row.post_count,
    is_archived: row.is_archived,
    created_at: row.created_at,
    owner: {
      id: row.owner_id,
      // A missing name means the owner's row is gone, not that they are called
      // "Unknown" — say the least alarming true thing.
      name: row.owner_name ?? "A mentor",
      profile_image: row.owner_image,
    },
    viewer_is_member: row.viewer_is_member,
    viewer_is_owner: row.viewer_is_owner,
    viewer_can_post: row.viewer_can_post,
  };
}

export const listCommunities = async (options: CommunityListOptions = {}) => {
  const { search = "", kind = "all", mine = false, limit = 24, offset = 0 } = options;

  const { data, error } = await supabase.rpc("list_communities", {
    p_search: search,
    p_kind: kind,
    p_mine: mine,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("Error listing communities:", error);
    return { data: [] as Community[], total: 0, error };
  }

  const rows = (data ?? []) as CommunityRow[];
  return {
    data: rows.map(toCommunity),
    total: Number(rows[0]?.total_count ?? 0),
    error: null,
  };
};

export const getCommunityBySlug = async (slug: string) => {
  const { data, error } = await supabase.rpc("get_community", { p_slug: slug });

  if (error) {
    console.error("Error fetching community:", error);
    return { data: null, error };
  }

  const row = ((data ?? []) as CommunityRow[])[0];
  if (!row) return { data: null, error: new Error("Community not found") };

  return { data: toCommunity(row), error: null };
};

export const getCommunityMembers = async (communityId: string, limit = 50) => {
  const { data, error } = await supabase.rpc("get_community_members", {
    p_community_id: communityId,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching community members:", error);
    return { data: [] as CommunityMember[], error };
  }

  const members: CommunityMember[] = (data ?? []).map((row) => ({
    user_id: row.user_id,
    name: row.name ?? "A student",
    profile_image: row.profile_image,
    role: row.role,
    is_mentor: row.is_mentor,
    joined_at: row.joined_at,
  }));

  return { data: members, error: null };
};

export type CreateCommunityInput = {
  name: string;
  description: string;
  kind: string;
};

/**
 * Only mentors can get past the insert policy. The client checks first purely so
 * a student sees an explanation rather than a raw policy violation.
 */
export const createCommunity = async (input: CreateCommunityInput) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { data: null, error: new Error("You need to be signed in") };

  const name = sanitizeInput(input.name, NAME_MAX).trim();
  const description = sanitizeInput(input.description, DESCRIPTION_MAX).trim();

  if (name.length < NAME_MIN) {
    return { data: null, error: new Error(`Give the group a name of at least ${NAME_MIN} characters`) };
  }
  if (description.length < DESCRIPTION_MIN) {
    return {
      data: null,
      error: new Error(`Describe the group in at least ${DESCRIPTION_MIN} characters so people know what they're joining`),
    };
  }

  const { data, error } = await supabase
    .from("communities")
    .insert({ name, description, kind: input.kind, owner_id: user.id })
    .select("slug")
    .single();

  if (error) {
    console.error("Error creating community:", error);
    return { data: null, error };
  }

  return { data, error: null };
};

export const updateCommunity = async (
  communityId: string,
  patch: Partial<CreateCommunityInput> & { is_archived?: boolean },
) => {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (patch.name !== undefined) update.name = sanitizeInput(patch.name, NAME_MAX).trim();
  if (patch.description !== undefined) {
    update.description = sanitizeInput(patch.description, DESCRIPTION_MAX).trim();
  }
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.is_archived !== undefined) update.is_archived = patch.is_archived;

  const { error } = await supabase.from("communities").update(update).eq("id", communityId);

  if (error) console.error("Error updating community:", error);
  return { error };
};

export const joinCommunity = async (communityId: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("You need to be signed in to join") };

  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: user.id });

  if (error) console.error("Error joining community:", error);
  return { error };
};

export const leaveCommunity = async (communityId: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("You need to be signed in") };

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (error) console.error("Error leaving community:", error);
  return { error };
};

/** Owner-only; the policy rejects anyone else regardless of what the UI shows. */
export const addCommunityMember = async (communityId: string, userId: string) => {
  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: userId });

  if (error) console.error("Error adding community member:", error);
  return { error };
};

export const removeCommunityMember = async (communityId: string, userId: string) => {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);

  if (error) console.error("Error removing community member:", error);
  return { error };
};

/**
 * Who the owner may add by hand: mentors, whose names are already public, and
 * people they have actually messaged. Deliberately not a directory of every
 * student — see the comment on the RPC.
 */
export const findAddableUsers = async (communityId: string, search: string) => {
  const { data, error } = await supabase.rpc("community_addable_users", {
    p_community_id: communityId,
    p_search: search,
    p_limit: 10,
  });

  if (error) {
    console.error("Error searching addable users:", error);
    return { data: [], error };
  }

  return { data: data ?? [], error: null };
};
