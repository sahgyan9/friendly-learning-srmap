import { supabase } from "@/integrations/supabase/client";

/**
 * Channels a group owner has added to their workspace.
 *
 * The built-in room is NOT in here. It is the implicit 'general' channel that
 * community_group_messages has always written to, and it has no row — so a group
 * whose owner never made a channel reads exactly as it did before this existed.
 * Anything this returns is a room somebody deliberately created.
 *
 * Same untyped-RPC workaround as community-group-chat.ts: these ship in a
 * migration alongside this file rather than after a types regeneration.
 */
type RpcCaller = <T>(
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: T | null; error: { message: string } | null }>;

const callRpc = supabase.rpc.bind(supabase) as unknown as RpcCaller;

/** The channel every group has, whether or not it has any of its own. */
export const DEFAULT_CHANNEL = "general";

/** Matches the cap enforced by create_community_channel. */
export const MAX_CHANNELS = 10;

export const CHANNEL_NAME_MAX = 32;
export const CHANNEL_TOPIC_MAX = 140;

export type CommunityChannel = {
  id: string;
  slug: string;
  topic: string | null;
  createdBy: string;
  createdAt: string;
  messageCount: number;
};

type ChannelRow = {
  id: string;
  slug: string;
  topic: string | null;
  created_by: string;
  created_at: string;
  message_count: number;
};

const toChannel = (row: ChannelRow): CommunityChannel => ({
  id: row.id,
  slug: row.slug,
  topic: row.topic,
  createdBy: row.created_by,
  createdAt: row.created_at,
  messageCount: row.message_count ?? 0,
});

/**
 * The same transformation `slugify()` does in Postgres, so the modal can show
 * the owner what their channel will actually be called before they commit to it.
 * The value that gets stored is still the one the database derives — this is a
 * preview, not the input.
 */
export const previewChannelSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

export const listCommunityChannels = async (communityId: string) => {
  const { data, error } = await callRpc<ChannelRow[]>("list_community_channels", {
    p_community_id: communityId,
  });

  if (error) {
    console.error("Error listing community channels:", error);
    return { data: [] as CommunityChannel[], error };
  }

  return { data: (data ?? []).map(toChannel), error: null };
};

export const createCommunityChannel = async (
  communityId: string,
  name: string,
  topic?: string | null,
) => {
  const { data, error } = await callRpc<string>("create_community_channel", {
    p_community_id: communityId,
    p_name: name,
    p_topic: topic?.trim() || null,
  });

  if (error) console.error("Error creating community channel:", error);
  return { data, error };
};

/** Resolves to the number of messages the delete destroyed. */
export const deleteCommunityChannel = async (channelId: string) => {
  const { data, error } = await callRpc<number>("delete_community_channel", {
    p_channel_id: channelId,
  });

  if (error) console.error("Error deleting community channel:", error);
  return { data, error };
};
