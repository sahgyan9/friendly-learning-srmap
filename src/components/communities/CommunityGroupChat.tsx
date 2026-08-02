import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Hash,
  Send,
  Smile,
  MessageSquare,
  ShieldCheck,
  Crown,
  CornerDownRight,
  Sparkles,
  Users,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

export interface GroupChatMessage {
  id: string;
  communityId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  senderRole?: string | null;
  isOwner?: boolean;
  isMentor?: boolean;
  content: string;
  timestamp: string;
  channel: string;
  replyTo?: {
    senderName: string;
    content: string;
  };
  reactions: Record<string, number>;
  userReactions: string[]; // Emojis caller reacted with
}

interface CommunityGroupChatProps {
  communityId: string;
  communityName: string;
  ownerName: string;
  isMember: boolean;
  isOwner: boolean;
}

const CHANNELS = [
  { id: "general", name: "general", icon: Hash, desc: "General group discussions & chat" },
  { id: "announcements", name: "announcements", icon: Sparkles, desc: "Important updates & announcements" },
  { id: "project-ideas", name: "project-ideas", icon: MessageSquare, desc: "Collaborate on projects & hackathons" },
];

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "👏", "💯"];

export const CommunityGroupChat: React.FC<CommunityGroupChatProps> = ({
  communityId,
  communityName,
  ownerName,
  isMember,
  isOwner,
}) => {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState("general");
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<GroupChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storageKey = `group_chat_messages_${communityId}`;

  // Load chat messages from localStorage or initialize with seed welcome messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        const initialSeedMessages: GroupChatMessage[] = [
          {
            id: "seed-1",
            communityId,
            senderId: "owner-id",
            senderName: ownerName || "Group Lead",
            senderAvatar: null,
            senderRole: "Group Leader",
            isOwner: true,
            isMentor: true,
            content: `Welcome everyone to #${activeChannel} in ${communityName}! Feel free to drop a message or start a discussion. 🎉`,
            timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: "general",
            reactions: { "👋": 3, "🚀": 2 },
            userReactions: [],
          },
          {
            id: "seed-2",
            communityId,
            senderId: "system-id",
            senderName: "Study Buddy Bot",
            senderAvatar: null,
            senderRole: "Bot",
            isOwner: false,
            isMentor: false,
            content: "💡 Tip: You can react to messages with emojis or reply directly just like on Discord!",
            timestamp: new Date(Date.now() - 3600000 * 1).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: "general",
            reactions: { "💡": 4 },
            userReactions: [],
          },
        ];
        setMessages(initialSeedMessages);
        localStorage.setItem(storageKey, JSON.stringify(initialSeedMessages));
      }
    } catch {
      // Fallback
    }
  }, [communityId, communityName, ownerName, storageKey]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannel]);

  const saveMessages = (updated: GroupChatMessage[]) => {
    setMessages(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed saving group chat messages", e);
    }
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (!user) {
      toast.error("Please sign in to send messages");
      return;
    }

    if (!isMember && !isOwner) {
      toast.error("You must join this group to post messages");
      return;
    }

    const newMessage: GroupChatMessage = {
      id: `msg-${Date.now()}`,
      communityId,
      senderId: user.id,
      senderName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
      senderAvatar: user.user_metadata?.avatar_url || null,
      senderRole: isOwner ? "Owner" : "Member",
      isOwner,
      isMentor: false,
      content: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: activeChannel,
      replyTo: replyingTo
        ? {
            senderName: replyingTo.senderName,
            content: replyingTo.content.slice(0, 60),
          }
        : undefined,
      reactions: {},
      userReactions: [],
    };

    saveMessages([...messages, newMessage]);
    setInputText("");
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    if (!user) {
      toast.error("Sign in to react");
      return;
    }

    const updated = messages.map((msg) => {
      if (msg.id !== msgId) return msg;

      const userReactions = msg.userReactions || [];
      const hasReacted = userReactions.includes(emoji);
      const reactions = { ...(msg.reactions || {}) };

      if (hasReacted) {
        reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
        if (reactions[emoji] === 0) delete reactions[emoji];
        return {
          ...msg,
          reactions,
          userReactions: userReactions.filter((e) => e !== emoji),
        };
      } else {
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return {
          ...msg,
          reactions,
          userReactions: [...userReactions, emoji],
        };
      }
    });

    saveMessages(updated);
  };

  const channelMessages = messages.filter((m) => m.channel === activeChannel);
  const currentChannelMeta = CHANNELS.find((c) => c.id === activeChannel);

  return (
    <Card className="border shadow-md overflow-hidden bg-background">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[550px] h-[600px]">
        
        {/* Discord-style Channel Sidebar */}
        <div className="border-r bg-muted/40 p-4 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 px-2 pb-3 mb-3 border-b">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {communityName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{communityName}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Group Chat
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-2 tracking-wider">
              Text Channels
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
                        ? "bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-semibold"
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
              <Crown className="h-3 w-3 text-amber-500" /> Admin
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
                  <Hash className="h-4 w-4 text-indigo-500 hidden md:inline" />
                  {activeChannel}
                </h3>
                <p className="text-[11px] text-muted-foreground">{currentChannelMeta?.desc}</p>
              </div>
            </div>

            {/* Mobile Channel switcher buttons */}
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
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                  <Hash className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-base text-foreground">Welcome to #{activeChannel}!</h4>
                <p className="text-xs max-w-sm mt-1">This is the start of the #{activeChannel} channel. Say hello to your group members.</p>
              </div>
            ) : (
              channelMessages.map((msg, index) => {
                const isMe = user?.id === msg.senderId;

                return (
                  <div key={msg.id} className="group relative flex gap-3 hover:bg-muted/30 p-2 rounded-lg transition-colors">
                    <Avatar className="h-9 w-9 border shrink-0">
                      <AvatarImage src={msg.senderAvatar || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {msg.senderName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                          {msg.senderName}
                          {msg.isOwner && (
                            <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Crown className="h-2.5 w-2.5 mr-0.5 inline" /> Owner
                            </Badge>
                          )}
                          {msg.isMentor && (
                            <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" /> Mentor
                            </Badge>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                      </div>

                      {/* Reply reference banner if any */}
                      {msg.replyTo && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border-l-2 border-indigo-500 mb-1">
                          <CornerDownRight className="h-3 w-3" />
                          <span className="font-medium text-foreground">{msg.replyTo.senderName}:</span>
                          <span className="truncate max-w-[250px]">{msg.replyTo.content}</span>
                        </div>
                      )}

                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>

                      {/* Reactions bar */}
                      <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                        {Object.entries(msg.reactions || {}).map(([emoji, count]) => {
                          const reacted = msg.userReactions?.includes(emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                                reacted
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300 font-bold"
                                  : "bg-muted/40 border-muted text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <span>{emoji}</span>
                              <span>{count}</span>
                            </button>
                          );
                        })}

                        {/* Quick Add Reaction floating toolbar on hover */}
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
                            className="text-[10px] text-muted-foreground hover:text-indigo-600 px-1 font-medium"
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
            <div className="flex items-center justify-between px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border-t border-indigo-200 text-xs text-indigo-800 dark:text-indigo-200">
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
            {!isMember && !isOwner ? (
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
                  className="text-xs font-sans h-10 bg-muted/30 focus-visible:ring-indigo-500"
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!inputText.trim()} className="bg-indigo-600 hover:bg-indigo-700 h-10 w-10 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

        </div>

      </div>
    </Card>
  );
};
