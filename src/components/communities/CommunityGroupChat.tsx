import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/utils/user-utils";
import {
  Send,
  Loader2,
  MessageSquare,
  Heart,
  Lock,
  Crown,
  ShieldCheck,
  CornerDownRight,
  FileText,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  listGroupMessages,
  sendGroupMessage,
  toggleGroupMessageReaction,
  type GroupChatMessage,
} from "@/integrations/supabase/services/community-group-chat";
import type { CommunityPost } from "@/integrations/supabase/services/community-posts";

interface CommunityGroupChatProps {
  communityId: string;
  communityKind: string;
  ownerName: string;
  isMember: boolean;
  isOwner: boolean;
  /** Posts made in this group. They render inline, in time order, not in a tab. */
  posts: CommunityPost[];
  onOpenPost: (postId: string) => void;
  /** Opens the write-a-post composer. Absent when the viewer cannot post. */
  onCreatePost?: () => void;
  /**
   * Which room to read and write. Defaults to the built-in one, so every
   * existing call site keeps the behaviour it had.
   */
  channel?: string;
  /** The channel's stated purpose, shown in its empty state. */
  channelTopic?: string | null;
}

/**
 * One conversation, not two tabs.
 *
 * This used to be the "Group Chat" half of a tabbed page whose other half was
 * "Posts & Discussions". Splitting a room in two is a choice you can afford
 * once both halves are busy; with the posts side empty product-wide it just
 * meant every group showed a tab with nothing behind it. Posts now appear in
 * the same stream as the messages, ordered by time, so there is one place to
 * look and one place to write.
 *
 * The channel sidebar went the same way. #general, #announcements and
 * #project-ideas were three rooms dividing a handful of messages between them —
 * every message ever sent here landed in #general and the other two read as
 * abandoned. Everything is written to the "general" channel still, so the
 * history stays addressable and channels can come back the day there is enough
 * traffic to be worth splitting.
 *
 * That day is now partly here: an owner can add rooms of their own, and this
 * component renders whichever one is selected via the `channel` prop. The
 * difference from the version that was removed is who decides. Nothing is
 * created by default, so a group that wants one conversation still has exactly
 * one — the failure last time was three rooms every group was given, not the
 * existence of a second room a group asked for.
 *
 * Posts stay in the built-in room only. A post belongs to the group rather than
 * to any channel, and duplicating the whole post stream into every room would
 * make each one look busier than it is — the exact illusion this is trying to
 * avoid.
 */

const DEFAULT_CHANNEL = "general";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "👏"];

/**
 * Openers offered when the room is empty, by group kind.
 *
 * They fill the box rather than send: the words still have to be chosen and
 * sent by a person, so nobody is put on record saying something they did not
 * write. The point is only to remove the blank-page moment, which is what
 * actually stops a first message getting written.
 */
const STARTERS: Record<string, string[]> = {
  hackathon: ["What are we building?", "Which skills are we still missing?", "When do we meet next?"],
  project: ["What's built so far?", "What should I pick up first?", "Where's the repo?"],
  club: ["When's the next meet?", "How do I get involved?", "What did I miss?"],
  study: ["What are we revising this week?", "Anyone up for a session today?", "Where are the notes?"],
  research: ["What should we read first?", "Sharing a paper I found —", "What's everyone working on?"],
  general: ["Hi everyone 👋", "What is this group for?", "What's everyone working on?"],
};

/** A message and a post both land in the stream; this is what they have in common. */
type StreamItem =
  | { kind: "message"; at: number; message: GroupChatMessage }
  | { kind: "post"; at: number; post: CommunityPost };

export const CommunityGroupChat: React.FC<CommunityGroupChatProps> = ({
  communityId,
  communityKind,
  ownerName,
  isMember,
  isOwner,
  posts = [],
  onOpenPost,
  onCreatePost,
  channel = DEFAULT_CHANNEL,
  channelTopic,
}) => {
  const { user } = useAuth();
  const isDefaultChannel = channel === DEFAULT_CHANNEL;
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * The read failed rather than came back empty.
   *
   * list_group_messages is not granted to `anon`, deliberately — the group chat
   * is for people who have signed in. That makes "no messages" and "you may not
   * read the messages" two different states which look identical from the array
   * alone, and telling a visitor that a room with five messages in it is empty
   * is worse than telling them nothing.
   */
  const [unreadable, setUnreadable] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupChatMessage | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canPost = isMember || isOwner;

  const load = useCallback(async () => {
    const { data, error } = await listGroupMessages(communityId, channel);
    setMessages(data);
    setUnreadable(Boolean(error));
    setLoading(false);
  }, [communityId, channel]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Switching rooms drops a half-attached reply. Nothing server-side would stop
  // it — reply_to_id is a plain foreign key to any message in the table, so a
  // cross-channel reply saves fine and then renders a quoted line from a room
  // the reader cannot see from here. Clearing it on the way out is the whole fix.
  useEffect(() => {
    setReplyingTo(null);
  }, [channel]);

  // payload.old/new on this table only carries changed columns, not a joined
  // sender name — simplest correct move is to re-fetch rather than patch
  // state off the raw row. Debounced so a burst of reactions or messages
  // doesn't fire a refetch per event.
  const refetchTimer = useRef<ReturnType<typeof setTimeout>>();
  useRealtimeSubscription(
    "community_group_messages",
    () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => load(), 250);
    },
    { column: "community_id", value: communityId },
  );

  /** Messages and posts on one timeline, oldest first, the way a room reads. */
  const items = useMemo<StreamItem[]>(() => {
    const merged: StreamItem[] = [
      ...messages.map((message) => ({
        kind: "message" as const,
        at: new Date(message.createdAt).getTime(),
        message,
      })),
      // Only in the built-in room. A post is attached to the group, not to a
      // channel, so repeating it in every room would pad each one with the same
      // content and make five quiet rooms all look active.
      ...(isDefaultChannel
        ? posts.map((post) => ({
            kind: "post" as const,
            at: new Date(post.created_at).getTime(),
            post,
          }))
        : []),
    ];
    return merged.sort((a, b) => a.at - b.at);
  }, [messages, posts, isDefaultChannel]);

  // Scrolls only the message pane itself, never the outer page. A plain
  // scrollIntoView() walks every scrollable ancestor — including the window —
  // so opening a group was yanking the whole page down past the header before
  // anyone could see the join button or the open/invite-only badge.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [items]);

  const handleSendMessage = async () => {
    const content = inputText.trim();
    if (!content) return;

    if (!user) {
      toast.error("Please sign in to send messages");
      return;
    }
    if (!canPost) {
      toast.error("You must join this group to post messages");
      return;
    }

    setSending(true);
    const { error } = await sendGroupMessage(communityId, channel, content, replyingTo?.id ?? null);
    setSending(false);

    if (error) {
      toast.error(error.message || "Could not send that message");
      return;
    }

    setInputText("");
    setReplyingTo(null);
    load();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!user) {
      toast.error("Sign in to react");
      return;
    }
    const { error } = await toggleGroupMessageReaction(msgId, emoji);
    if (error) {
      toast.error(error.message || "Could not react to that message");
      return;
    }
    load();
  };

  // Not named useStarter: a `use` prefix makes React's rules-of-hooks linting
  // treat it as a hook, and it is called from a click handler.
  const applyStarter = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  const starters = STARTERS[communityKind] ?? STARTERS.general;

  return (
    <div className="flex h-[min(72vh,720px)] min-h-[460px] flex-col overflow-hidden rounded-xl border bg-background">
      {/* Stream */}
      <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : unreadable && items.length === 0 ? (
          /* Not empty — closed. Saying "nobody's said anything" to someone who
             simply is not allowed to look would be a plain untruth, and the
             busiest group on the site is the one it would be told about. */
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <h4 className="text-base font-semibold text-foreground">
              {user ? "Couldn't load the conversation" : "Sign in to read the conversation"}
            </h4>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {user
                ? "Something went wrong fetching the messages."
                : "The group's messages are for students who have signed in. Everything above is public."}
            </p>
            {user ? (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => load()}>
                Try again
              </Button>
            ) : (
              <Button asChild size="sm" className="mt-4">
                <Link to="/signin">Sign in</Link>
              </Button>
            )}
          </div>
        ) : items.length === 0 ? (
          /* An empty room is the normal state of a new group, not a failure.
             It says so plainly, then hands over something to type — a blank box
             under the word "Welcome" is what stops the first message existing. */
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h4 className="text-base font-semibold text-foreground">
              {isDefaultChannel ? "Nobody's said anything yet" : `#${channel} is empty`}
            </h4>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {!isDefaultChannel
                ? /* A channel's own description is the best answer to "what goes
                     in here", and the owner already wrote it. */
                  channelTopic ||
                  (canPost
                    ? "This room was made for a reason — say what belongs in it."
                    : "Join the group to post here.")
                : canPost
                  ? `Whatever you write here is what everyone who joins later reads first. ${ownerName} runs this group.`
                  : `Join the group to say something. ${ownerName} runs it.`}
            </p>

            {/* Starters are for the group's first conversation. A channel made
                on purpose does not need "What is this group for?" offered in it. */}
            {canPost && isDefaultChannel && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => applyStarter(starter)}
                    className="rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          items.map((item) =>
            item.kind === "post" ? (
              /* A post in the stream. Deliberately not the full PostCard from
                 the feed — at that size one post buries a day of conversation.
                 It reads as "someone wrote something longer", and opens. */
              <button
                key={`post-${item.post.id}`}
                type="button"
                onClick={() => onOpenPost(item.post.id)}
                className="block w-full rounded-lg border border-primary/20 bg-primary/[0.03] p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.06]"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0 border">
                    <AvatarImage src={item.post.author.profile_image ?? undefined} alt="" />
                    <AvatarFallback className="text-[10px] font-bold">
                      {getInitials(item.post.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-semibold">{item.post.author.name}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                    <FileText className="h-3 w-3" />
                    posted
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(item.post.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="text-sm font-semibold leading-snug">{item.post.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {item.post.content}
                </p>

                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {item.post.likes_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {item.post.comments_count}
                  </span>
                  <span className="font-medium text-primary">Open post →</span>
                </div>
              </button>
            ) : (
              <div
                key={item.message.id}
                className="group relative flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30"
              >
                <Avatar className="h-9 w-9 shrink-0 border">
                  <AvatarImage src={item.message.senderAvatar ?? undefined} />
                  <AvatarFallback className="text-xs font-bold">
                    {getInitials(item.message.senderName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                      {item.message.senderName}
                      {item.message.isOwner && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          <Crown className="mr-0.5 inline h-2.5 w-2.5" /> Owner
                        </Badge>
                      )}
                      {item.message.isMentor && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                          <ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" /> Mentor
                        </Badge>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {item.message.replyTo && (
                    <div className="mb-1 flex items-center gap-1 rounded border-l-2 border-primary bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                      <CornerDownRight className="h-3 w-3" />
                      <span className="font-medium text-foreground">
                        {item.message.replyTo.senderName}:
                      </span>
                      <span className="max-w-[250px] truncate">{item.message.replyTo.content}</span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {item.message.content}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {Object.entries(item.message.reactions).map(([emoji, count]) => {
                      const reacted = item.message.viewerReactions.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(item.message.id, emoji)}
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${
                            reacted
                              ? "border-primary/30 bg-primary/10 font-bold text-primary"
                              : "border-muted bg-muted/40 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}

                    {canPost && (
                      <div className="ml-2 flex items-center gap-0.5 rounded-full border bg-background px-1 py-0.5 opacity-0 shadow-xs transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(item.message.id, emoji)}
                            className="px-0.5 text-xs transition-transform hover:scale-125"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReplyingTo(item.message)}
                          className="px-1 text-[10px] font-medium text-muted-foreground hover:text-primary"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      {/* Reply banner */}
      {replyingTo && (
        <div className="flex items-center justify-between border-t border-primary/20 bg-primary/5 px-4 py-1.5 text-xs text-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <CornerDownRight className="h-3.5 w-3.5" /> Replying to{" "}
            <strong className="font-semibold">{replyingTo.senderName}</strong>: "
            {replyingTo.content.slice(0, 40)}
            {replyingTo.content.length > 40 ? "…" : ""}"
          </span>
          <button onClick={() => setReplyingTo(null)} className="text-xs font-bold hover:underline">
            Cancel
          </button>
        </div>
      )}

      {/* Composer. "Write a post" lives here rather than in a tab of its own —
          it is a longer message, not a different place. */}
      <div className="border-t bg-background p-3">
        {!canPost ? (
          <div className="rounded-lg bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
            {user ? (
              "Join this group to join the conversation."
            ) : (
              <>
                <Link to="/signin" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>{" "}
                and join the group to take part.
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isDefaultChannel ? "Write a message…" : `Message #${channel}…`}
              className="h-10 bg-muted/30 font-sans text-sm"
              disabled={sending}
              aria-label={
                isDefaultChannel
                  ? "Write a message to this group"
                  : `Write a message in #${channel}`
              }
            />
            {/* Posting is a group-level act and its result only shows in the
                built-in room, so the shortcut is not offered from elsewhere. */}
            {onCreatePost && isDefaultChannel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCreatePost}
                className="h-10 shrink-0 gap-1.5 px-2 text-muted-foreground"
                title="Write a longer post instead"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Post</span>
              </Button>
            )}
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || sending}
              className="h-10 w-10 shrink-0"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
