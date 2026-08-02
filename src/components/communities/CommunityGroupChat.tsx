import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { getInitials } from "@/utils/user-utils";
import {
  Hash,
  Send,
  Loader2,
  MessageSquare,
  Crown,
  ShieldCheck,
  CornerDownRight,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  listGroupMessages,
  sendGroupMessage,
  toggleGroupMessageReaction,
  type GroupChatMessage,
} from "@/integrations/supabase/services/community-group-chat";

interface CommunityGroupChatProps {
  communityId: string;
  communitySlug: string;
  communityKind: string;
  communityName: string;
  communityCoverImage?: string | null;
  ownerName: string;
  isMember: boolean;
  isOwner: boolean;
}

const CHANNELS = [
  { id: "general", name: "general", icon: Hash, desc: "General group discussion" },
  { id: "announcements", name: "announcements", icon: Sparkles, desc: "Important updates & announcements" },
  { id: "project-ideas", name: "project-ideas", icon: MessageSquare, desc: "Collaborate on projects & hackathons" },
];

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "👏"];

export const CommunityGroupChat: React.FC<CommunityGroupChatProps> = ({
  communityId,
  communitySlug,
  communityKind,
  communityName,
  communityCoverImage,
  ownerName,
  isMember,
  isOwner,
}) => {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState("general");
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canPost = isMember || isOwner;

  const load = useCallback(
    async (channel: string) => {
      const { data } = await listGroupMessages(communityId, channel);
      setMessages(data);
      setLoading(false);
    },
    [communityId],
  );

  useEffect(() => {
    setLoading(true);
    load(activeChannel);
  }, [load, activeChannel]);

  // payload.old/new on this table only carries changed columns, not a joined
  // sender name — simplest correct move is to re-fetch rather than patch
  // state off the raw row. Debounced so a burst of reactions or messages
  // doesn't fire a refetch per event.
  const refetchTimer = useRef<ReturnType<typeof setTimeout>>();
  useRealtimeSubscription(
    "community_group_messages",
    () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => load(activeChannel), 250);
    },
    { column: "community_id", value: communityId },
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const { error } = await sendGroupMessage(communityId, activeChannel, content, replyingTo?.id ?? null);
    setSending(false);

    if (error) {
      toast.error(error.message || "Could not send that message");
      return;
    }

    setInputText("");
    setReplyingTo(null);
    load(activeChannel);
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
    load(activeChannel);
  };

  const currentChannelMeta = CHANNELS.find((c) => c.id === activeChannel);

  return (
    <Card className="border shadow-sm overflow-hidden bg-background">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[550px] h-[600px]">

        {/* Channel Sidebar */}
        <div className="border-r bg-muted/40 p-4 flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 px-2 pb-3 mb-3 border-b">
              <CommunityAvatar
                slug={communitySlug}
                kind={communityKind}
                name={communityName}
                coverImage={communityCoverImage}
                className="h-8 w-8 rounded-lg"
                emojiClassName="text-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{communityName}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Group Chat
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-2 tracking-wider">
              Channels
            </p>

            <div className="space-y-1">
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                const active = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-2 bg-background/80 rounded-lg border text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Crown className="h-3 w-3 text-amber-500" /> Group lead
            </p>
            <p className="truncate">{ownerName}</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex flex-col h-full bg-background/50">

          {/* Channel Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted text-foreground md:hidden">
                <Hash className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-primary hidden md:inline" />
                  {activeChannel}
                </h3>
                <p className="text-[11px] text-muted-foreground">{currentChannelMeta?.desc}</p>
              </div>
            </div>

            <div className="flex md:hidden gap-1">
              {CHANNELS.map((ch) => (
                <Button
                  key={ch.id}
                  size="sm"
                  variant={activeChannel === ch.id ? "default" : "outline"}
                  onClick={() => setActiveChannel(ch.id)}
                  className="h-7 text-xs px-2"
                >
                  #{ch.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Hash className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-foreground">Welcome to #{activeChannel}!</h4>
                <p className="text-xs max-w-sm mt-1">This is the start of the #{activeChannel} channel. Say hello to your group members.</p>
              </div>
            ) : (
              messages.map((msg) => {
                return (
                  <div key={msg.id} className="group relative flex gap-3 hover:bg-muted/30 p-2 rounded-lg transition-colors">
                    <Avatar className="h-9 w-9 border shrink-0">
                      <AvatarImage src={msg.senderAvatar ?? undefined} />
                      <AvatarFallback className="text-xs font-bold">
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                          {msg.senderName}
                          {msg.isOwner && (
                            <Badge variant="outline" className="h-4 text-[9px] px-1">
                              <Crown className="h-2.5 w-2.5 mr-0.5 inline" /> Owner
                            </Badge>
                          )}
                          {msg.isMentor && (
                            <Badge variant="secondary" className="h-4 text-[9px] px-1">
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" /> Mentor
                            </Badge>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {msg.replyTo && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border-l-2 border-primary mb-1">
                          <CornerDownRight className="h-3 w-3" />
                          <span className="font-medium text-foreground">{msg.replyTo.senderName}:</span>
                          <span className="truncate max-w-[250px]">{msg.replyTo.content}</span>
                        </div>
                      )}

                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                        {Object.entries(msg.reactions).map(([emoji, count]) => {
                          const reacted = msg.viewerReactions.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                                reacted
                                  ? "bg-primary/10 border-primary/30 text-primary font-bold"
                                  : "bg-muted/40 border-muted text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          );
                        })}

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 ml-2 bg-background border shadow-xs rounded-full px-1 py-0.5">
                          {QUICK_EMOJIS.slice(0, 4).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs px-0.5"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="text-[10px] text-muted-foreground hover:text-primary px-1 font-medium"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-primary/5 border-t border-primary/20 text-xs text-foreground">
              <span className="flex items-center gap-1.5 truncate">
                <CornerDownRight className="h-3.5 w-3.5" /> Replying to <strong className="font-semibold">{replyingTo.senderName}</strong>: "{replyingTo.content.slice(0, 40)}..."
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-xs font-bold hover:underline">
                Cancel
              </button>
            </div>
          )}

          {/* Message Input Box */}
          <div className="p-3 border-t bg-background">
            {!canPost ? (
              <div className="text-center py-2 px-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                Join this group to participate in the conversation.
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannel}...`}
                  className="text-xs font-sans h-10 bg-muted/30"
                  disabled={sending}
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!inputText.trim() || sending} className="h-10 w-10 shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

        </div>

      </div>
    </Card>
  );
};
