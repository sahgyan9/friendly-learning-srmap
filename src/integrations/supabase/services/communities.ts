import { BookOpen, Drama, MessagesSquare, Microscope, Wrench, Zap } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeInput } from "@/utils/input-sanitization";
import { storagePathFromPublicUrl } from "@/lib/image/storage-path";
import { POST_IMAGE_BUCKET } from "@/integrations/supabase/services/community-posts";

type CommunityInsert = Database["public"]["Tables"]["communities"]["Insert"];

/**
 * Communities: groups anyone signed in can start, and anyone can join.
 *
 * Reads go through SECURITY DEFINER RPCs because every one of them needs the
 * owner's or a member's name, and public.users is owner-only readable by design.
 * Writes are plain table calls — the rules live in RLS, where they hold whoever
 * is calling and whatever the UI happens to render.
 */

export const COMMUNITY_KINDS = [
  { value: "hackathon", label: "Hackathon team", icon: Zap },
  { value: "project", label: "Project group", icon: Wrench },
  { value: "club", label: "Club or society", icon: Drama },
  { value: "study", label: "Study group", icon: BookOpen },
  { value: "research", label: "Research group", icon: Microscope },
  { value: "general", label: "Something else", icon: MessagesSquare },
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
  /**
   * Newest of: last chat message, last post, and the group's own creation.
   *
   * This is what the UI shows instead of a total. "34 discussions" is a number
   * this product does not have yet; "active 2 hours ago" is one it does, and it
   * answers the question a student is actually asking before walking in.
   *
   * Falls back to created_at when the deployed RPC predates the column, so the
   * frontend can ship ahead of the migration and quietly get more accurate.
   */
  last_activity_at: string;
  owner: { id: string; name: string; profile_image: string | null; is_mentor: boolean };
  viewer_is_member: boolean;
  viewer_is_owner: boolean;
  /** Only present from getCommunityBySlug. Members of a live group may post. */
  viewer_can_post?: boolean;
  /**
   * A private group is still listed and searchable — that is what makes it
   * joinable at all. What changes is that joining goes through the owner and
   * the posts are members-only.
   */
  visibility: CommunityVisibility;
  viewer_has_requested: boolean;
  viewer_has_invite: boolean;
  /**
   * Decides whether the posts render. True for every public group, and for
   * members, the owner and admins of a private one. Only present from
   * getCommunityBySlug.
   */
  viewer_can_view?: boolean;
  /** Non-zero only for the owner and admins. */
  pending_request_count?: number;
};

export type CommunityVisibility = "public" | "private";

export type JoinRequest = {
  id: string;
  user_id: string;
  name: string;
  profile_image: string | null;
  is_mentor: boolean;
  message: string | null;
  created_at: string;
};

export type MyInvite = {
  id: string;
  community_id: string;
  community_name: string;
  community_slug: string;
  invited_by_name: string | null;
  created_at: string;
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
  /** Absent until the last-activity migration is applied. */
  last_activity_at?: string | null;
  owner_id: string;
  owner_name: string | null;
  owner_image: string | null;
  /** Only present from getCommunityBySlug. */
  owner_is_mentor?: boolean;
  viewer_is_member: boolean;
  viewer_is_owner: boolean;
  viewer_can_post?: boolean;
  visibility?: string;
  viewer_has_requested?: boolean;
  viewer_has_invite?: boolean;
  viewer_can_view?: boolean;
  pending_request_count?: number;
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
    last_activity_at: row.last_activity_at ?? row.created_at,
    owner: {
      id: row.owner_id,
      // A missing name means the owner's row is gone, not that they are called
      // "Unknown" — say the least alarming true thing. No longer "A mentor":
      // owners are not necessarily mentors now.
      name: row.owner_name ?? "A student",
      profile_image: row.owner_image,
      is_mentor: Boolean(row.owner_is_mentor),
    },
    viewer_is_member: row.viewer_is_member,
    viewer_is_owner: row.viewer_is_owner,
    viewer_can_post: row.viewer_can_post,
    // Defaulting to public matters for more than tidiness: anything that fails
    // to come back gets the *open* treatment, so a missing column can never
    // make a public group look locked and turn its Join button into a request.
    visibility: row.visibility === "private" ? "private" : "public",
    viewer_has_requested: row.viewer_has_requested ?? false,
    viewer_has_invite: row.viewer_has_invite ?? false,
    viewer_can_view: row.viewer_can_view,
    pending_request_count: Number(row.pending_request_count ?? 0),
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

/** Live group count per kind, so the filter chips can hide the ones with nothing in them. */
export const getCommunityKindCounts = async () => {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
  ) => Promise<{ data: { kind: string; group_count: number }[] | null; error: unknown }>)(
    "community_kind_counts",
  );

  if (error) {
    console.error("Could not read community kind counts:", error);
    return {} as Record<string, number>;
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.kind, Number(row.group_count)]),
  ) as Record<string, number>;
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
  /** Defaults to public. Most groups should be. */
  visibility?: CommunityVisibility;
  /** A preset data: URL, an uploaded storage URL, or any pasted image link. */
  coverImage?: string | null;
};

/** Owning this many live groups at once stops you starting another. */
export const OWNED_GROUP_LIMIT = 10;

/**
 * Anyone signed in may start a group. The insert policy allows it as long as
 * `owner_id` is you and you own fewer than OWNED_GROUP_LIMIT live ones.
 *
 * That cap is the only thing that can reject an otherwise valid group, and
 * Postgres reports it as "new row violates row-level security policy" — true,
 * and no use whatsoever to the person reading it. Translated below.
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

  // `slug` is NOT NULL with no column default, so the generated types insist
  // callers supply it. They cannot see triggers: communities_set_slug runs
  // BEFORE INSERT, derives the slug from the name, and overwrites anything
  // passed in. Sending a value here would be dead weight at best and a
  // misleading one at worst, so the cast records that the database owns the
  // column rather than inventing a slug to satisfy the checker.
  const row = {
    name,
    description,
    kind: input.kind,
    owner_id: user.id,
    visibility: input.visibility ?? "public",
    cover_image: input.coverImage || null,
  } as CommunityInsert;

  const { data, error } = await supabase
    .from("communities")
    .insert(row)
    // `id` as well as `slug`: the create flow posts the owner's opening message
    // into the new group straight after this returns, so no group is born with
    // an empty room.
    .select("id, slug")
    .single();

  if (error) {
    console.error("Error creating community:", error);

    // The insert policy is the only gate left, and the cap is the only part of
    // it a well-behaved client can trip. Anything else here is a bug, so it is
    // passed through untouched rather than dressed up as a limit.
    if (error.code === "42501" || /row-level security/i.test(error.message)) {
      return {
        data: null,
        error: new Error(
          `You can run ${OWNED_GROUP_LIMIT} groups at a time. Archive one you've finished with to start another.`,
        ),
      };
    }

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
  if (patch.coverImage !== undefined) update.cover_image = patch.coverImage || null;

  // Read the outgoing icon before it's overwritten, mirroring the pattern in
  // updateCommunityPost — swapped or removed icons are cleaned out of storage
  // once the swap is confirmed to have taken.
  let previousCoverImage: string | null = null;
  if (patch.coverImage !== undefined) {
    const { data: existing } = await supabase
      .from("communities")
      .select("cover_image")
      .eq("id", communityId)
      .maybeSingle();
    previousCoverImage = existing?.cover_image ?? null;
  }

  const { error } = await supabase.from("communities").update(update as any).eq("id", communityId);

  if (error) {
    console.error("Error updating community:", error);
    return { error };
  }

  if (previousCoverImage && previousCoverImage !== update.cover_image) {
    await removeCoverImageIfOwned(previousCoverImage);
  }

  return { error: null };
};

/**
 * Removes a group icon from storage if the URL is actually one of ours —
 * uploaded icons live in the same bucket as post images (see
 * GroupIconPicker), while presets are data: URLs and pasted links are
 * someone else's storage. Never throws.
 */
async function removeCoverImageIfOwned(imageUrl: string) {
  const path = storagePathFromPublicUrl(POST_IMAGE_BUCKET, imageUrl);
  if (!path) return;

  const { error } = await supabase.storage.from(POST_IMAGE_BUCKET).remove([path]);
  if (error) console.error("Error removing community cover image:", error);
}

/**
 * Owner-only, enforced by the "Owners can delete their community" RLS policy
 * rather than anything here. `community_posts.community_id`,
 * `community_members.community_id` and the group chat tables all reference
 * `communities(id) on delete cascade`, so this takes the whole group —
 * members, posts and messages — with it. There is no undo.
 *
 * The row delete cascades in the database; it does not touch Storage, so the
 * icon is fetched first and removed afterward. Deliberately after the row
 * delete succeeds — see the matching comment on deleteCommunityPost.
 */
export const deleteCommunity = async (communityId: string) => {
  const { data: existing } = await supabase
    .from("communities")
    .select("cover_image")
    .eq("id", communityId)
    .maybeSingle();

  const { error } = await supabase.from("communities").delete().eq("id", communityId);

  if (error) {
    console.error("Error deleting community:", error);
    return { error };
  }

  if (existing?.cover_image) {
    await removeCoverImageIfOwned(existing.cover_image);
  }

  return { error: null };
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

/*
 * Private-group membership.
 *
 * Every one of these raises Postgres exceptions with sentences written to be
 * read by a person — "You already have a request waiting on this group", "Only
 * the group owner can invite people". Callers should surface `error.message`
 * rather than substituting a generic string; the specific one is nearly always
 * more use than "Something went wrong".
 *
 * Approving a request settles it and creates the membership in a single
 * transaction, and the same goes for accepting an invite. Never follow these
 * with an insert into community_members: two client calls leave an approved
 * request with nobody in the group behind it the first time the second fails.
 */

export const requestToJoinCommunity = async (communityId: string, message?: string) => {
  const trimmed = message ? sanitizeInput(message, 300).trim() : "";

  const { data, error } = await supabase.rpc("request_to_join_community", {
    p_community_id: communityId,
    p_message: trimmed || undefined,
  });

  if (error) {
    console.error("Error requesting to join community:", error);
    return { data: null, error };
  }

  return { data, error: null };
};

export const decideJoinRequest = async (requestId: string, approve: boolean) => {
  const { data, error } = await supabase.rpc("decide_join_request", {
    p_request_id: requestId,
    p_approve: approve,
  });

  if (error) {
    console.error("Error deciding join request:", error);
    return { data: null, error };
  }

  return { data, error: null };
};

export const listJoinRequests = async (communityId: string) => {
  const { data, error } = await supabase.rpc("list_join_requests", {
    p_community_id: communityId,
  });

  if (error) {
    console.error("Error listing join requests:", error);
    return { data: [] as JoinRequest[], error };
  }

  return { data: (data ?? []) as JoinRequest[], error: null };
};

export const inviteToCommunity = async (communityId: string, userId: string) => {
  const { data, error } = await supabase.rpc("invite_to_community", {
    p_community_id: communityId,
    p_user_id: userId,
  });

  if (error) {
    console.error("Error inviting to community:", error);
    return { data: null, error };
  }

  return { data, error: null };
};

export const listMyInvites = async () => {
  const { data, error } = await supabase.rpc("list_my_invites");

  if (error) {
    console.error("Error listing invites:", error);
    return { data: [] as MyInvite[], error };
  }

  return { data: (data ?? []) as MyInvite[], error: null };
};

export const respondToInvite = async (inviteId: string, accept: boolean) => {
  const { data, error } = await supabase.rpc("respond_to_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
  });

  if (error) {
    console.error("Error responding to invite:", error);
    return { data: null, error };
  }

  return { data, error: null };
};

export type UserJoinedCommunity = {
  role: string;
  joined_at: string;
  community: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    cover_image: string | null;
    member_count: number;
  };
};

/**
 * Returns the communities/clubs a student belongs to, with kind and role.
 * Useful for showing club badges on mentor and peer profile cards.
 */
export const getUserJoinedCommunities = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("community_members")
      .select("role, joined_at, communities(id, name, slug, kind, cover_image, member_count)")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user communities:", error);
      return [] as UserJoinedCommunity[];
    }

    return (data ?? [])
      .map((row: any) => ({
        role: row.role,
        joined_at: row.joined_at,
        community: Array.isArray(row.communities) ? row.communities[0] : row.communities,
      }))
      .filter((item) => item.community != null && item.community.name) as UserJoinedCommunity[];
  } catch (err) {
    console.error("Exception fetching user communities:", err);
    return [] as UserJoinedCommunity[];
  }
};

