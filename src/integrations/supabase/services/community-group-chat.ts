import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";

/**
 * Group chat reads and writes.
 *
 * These RPCs (list_group_messages, send_group_message,
 * toggle_group_message_reaction) aren't in the generated Database types yet —
 * they ship in a migration alongside this file rather than after a type
 * regeneration against the deployed schema. Same workaround already used for
 * community_kind_counts: cast supabase.rpc rather than wait.
 */
type RpcCaller = <T>(
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: T | null; error: { message: string } | null }>;

const callRpc = supabase.rpc.bind(supabase) as unknown as RpcCaller;

export type GroupChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  isOwner: boolean;
  isMentor: boolean;
  channel: string;
  content: string;
  replyTo: { id: string; senderName: string; content: string } | null;
  reactions: Record<string, number>;
  viewerReactions: string[];
  createdAt: string;
};

type GroupMessageRow = {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  is_owner: boolean;
  is_mentor: boolean;
  channel: string;
  content: string;
  reply_to_id: string | null;
  reply_to_sender_name: string | null;
  reply_to_content: string | null;
  reactions: Record<string, number> | null;
  viewer_reactions: string[] | null;
  created_at: string;
};

const toMessage = (row: GroupMessageRow): GroupChatMessage => ({
  id: row.id,
  senderId: row.sender_id,
  senderName: row.sender_name ?? "A student",
  senderAvatar: row.sender_avatar,
  isOwner: row.is_owner,
  isMentor: row.is_mentor,
  channel: row.channel,
  content: row.content,
  replyTo:
    row.reply_to_id && row.reply_to_content
      ? {
          id: row.reply_to_id,
          senderName: row.reply_to_sender_name ?? "A student",
          content: row.reply_to_content,
        }
      : null,
  reactions: row.reactions ?? {},
  viewerReactions: row.viewer_reactions ?? [],
  createdAt: row.created_at,
});

export const listGroupMessages = async (communityId: string, channel: string) => {
  const { data, error } = await callRpc<GroupMessageRow[]>("list_group_messages", {
    p_community_id: communityId,
    p_channel: channel,
  });

  if (error) {
    console.error("Error listing group messages:", error);
    return { data: [] as GroupChatMessage[], error };
  }

  return { data: (data ?? []).map(toMessage), error: null };
};

export const sendGroupMessage = async (
  communityId: string,
  channel: string,
  content: string,
  replyToId?: string | null,
) => {
  const { data, error } = await callRpc<string>("send_group_message", {
    p_community_id: communityId,
    p_channel: channel,
    p_content: sanitizeInput(content, 2000),
    p_reply_to_id: replyToId ?? null,
  });

  if (error) console.error("Error sending group message:", error);
  return { data, error };
};

export const toggleGroupMessageReaction = async (messageId: string, emoji: string) => {
  const { data, error } = await callRpc<boolean>("toggle_group_message_reaction", {
    p_message_id: messageId,
    p_emoji: emoji,
  });

  if (error) console.error("Error toggling group message reaction:", error);
  return { data, error };
};
