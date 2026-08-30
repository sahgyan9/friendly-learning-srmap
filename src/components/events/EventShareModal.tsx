import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Users,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  ExternalLink,
  Search,
  Download,
  Calendar,
  MapPin,
  Flame,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listCommunities, Community } from "@/integrations/supabase/services/communities";
import { sendGroupMessage } from "@/integrations/supabase/services/community-group-chat";
import { getUserConversations } from "@/integrations/supabase/services/chat/conversation.service";
import { sendMessage } from "@/integrations/supabase/services/chat/message.service";
import { Conversation } from "@/types/chat";
import { SRMAPEvent } from "@/hooks/useSRMAPEvents";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { getInitials } from "@/utils/user-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventShareModalProps {
  event: SRMAPEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const EventShareModal: React.FC<EventShareModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  // In-app sharing state
  const [joinedGroups, setJoinedGroups] = useState<Community[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [sendingGroupId, setSendingGroupId] = useState<string | null>(null);
  const [sentGroupIds, setSentGroupIds] = useState<Set<string>>(new Set());

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [sendingDmId, setSendingDmId] = useState<string | null>(null);
  const [sentDmIds, setSentDmIds] = useState<Set<string>>(new Set());

  const canonicalUrl = `${PRIMARY_DOMAIN}/events/${event.id}`;

  const { formattedDate, formattedTime } = useMemo(() => {
    const parseDate = (val: string) => new Date(val.replace(" ", "T") + "+05:30");
    const start = parseDate(event.startDate);
    const end = parseDate(event.endDate);

    const fStart = start.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const fEnd = end.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const dateStr = fStart === fEnd ? fStart : `${fStart} – ${fEnd}`;

    const tStart = start.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const tEnd = end.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const timeStr = `${tStart} – ${tEnd}`;

    return { formattedDate: dateStr, formattedTime: timeStr };
  }, [event]);

  const richShareText = useMemo(() => {
    return `🎓 *${event.title}*
📅 ${formattedDate} (${formattedTime})
📍 ${event.venue || "SRM University-AP Campus"}
🔗 ${canonicalUrl}`;
  }, [event, formattedDate, formattedTime, canonicalUrl]);

  // Load user's communities & chats when modal opens
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;

    const loadData = async () => {
      setIsLoadingGroups(true);
      setIsLoadingChats(true);

      try {
        const [groupsRes, chatsRes] = await Promise.all([
          listCommunities({ mine: true, limit: 30 }),
          getUserConversations(user.id),
        ]);

        if (isMounted) {
          if (groupsRes.data) setJoinedGroups(groupsRes.data);
          if (chatsRes.data) setConversations(chatsRes.data);
        }
      } catch (err) {
        console.error("Error loading share targets:", err);
      } finally {
        if (isMounted) {
          setIsLoadingGroups(false);
          setIsLoadingChats(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopied(true);
    toast.success("Event link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out ${event.title} at SRM University-AP on ${formattedDate}`,
          url: canonicalUrl,
        });
        toast.success("Shared successfully");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(richShareText);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const handleSendToGroup = async (group: Community) => {
    if (!user?.id) {
      toast.error("Please sign in to share to workspace groups");
      return;
    }

    setSendingGroupId(group.id);
    try {
      const messageContent = `📢 **Campus Event Share**\n\n${richShareText}`;
      const { error } = await sendGroupMessage(group.id, "general", messageContent);
      if (error) throw error;

      setSentGroupIds((prev) => new Set([...prev, group.id]));
      toast.success(`Shared to ${group.name}`);
    } catch (err) {
      console.error("Failed to share to group:", err);
      toast.error("Could not share to this group");
    } finally {
      setSendingGroupId(null);
    }
  };

  const handleSendToDm = async (conv: Conversation) => {
    if (!user?.id) {
      toast.error("Please sign in to send direct messages");
      return;
    }

    setSendingDmId(conv.id);
    try {
      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const messageContent = `📢 **Campus Event Share**\n\n${richShareText}`;
      const { error } = await sendMessage(conv.id, user.id, otherUserId, messageContent);
      if (error) throw error;

      setSentDmIds((prev) => new Set([...prev, conv.id]));
      toast.success("Sent message");
    } catch (err) {
      console.error("Failed to send DM:", err);
      toast.error("Could not send message");
    } finally {
      setSendingDmId(null);
    }
  };

  const getOtherUser = (conv: Conversation) => {
    return conv.user1_id === user?.id ? conv.user2 : conv.user1;
  };

  const filteredConversations = useMemo(() => {
    if (!dmSearch.trim()) return conversations;
    const q = dmSearch.toLowerCase().trim();
    return conversations.filter((c) => {
      const other = getOtherUser(c);
      return (other?.name || "").toLowerCase().includes(q);
    });
  }, [conversations, dmSearch, user?.id]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    canonicalUrl,
  )}&bgcolor=12-18-41&color=255-255-255`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Share Event</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate max-w-xs sm:max-w-sm">
                {event.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Event Preview Summary Card */}
        <div className="mx-4 mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold text-xs text-center flex-col leading-none">
            <Calendar className="h-4 w-4 mb-0.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{event.title}</p>
            <div className="flex flex-wrap items-center gap-x-2 text-2xs text-muted-foreground mt-0.5">
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="truncate flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                {event.venue || "SRMAP Campus"}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs: In-App Campus Share vs Fast Actions */}
        <Tabs defaultValue="in-app" className="w-full px-4 pt-2 pb-4">
          <TabsList className="grid w-full grid-cols-2 bg-muted/60 h-9 p-1">
            <TabsTrigger value="in-app" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              Share to Campus
            </TabsTrigger>
            <TabsTrigger value="external" className="text-xs gap-1.5 data-[state=active]:bg-background">
              <Share2 className="h-3.5 w-3.5 text-primary" />
              External & Links
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: IN-APP SHARING (Workspace Groups + Direct Messages) */}
          <TabsContent value="in-app" className="space-y-4 pt-3 mt-0 focus-visible:outline-none">
            {!user ? (
              <div className="rounded-xl border border-border/80 bg-muted/30 p-6 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Sign in to share this event directly into your Workspace Groups and Direct Messages.
                </p>
                <Button size="sm" asChild className="rounded-full text-xs px-5 bg-primary">
                  <Link to="/signin">Sign in to share in-app</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {/* 1. Workspace Groups Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                      Your Workspace Groups
                    </span>
                    <Link
                      to="/workspace-groups"
                      className="text-3xs text-primary hover:underline"
                      onClick={onClose}
                    >
                      Browse all
                    </Link>
                  </div>

                  {isLoadingGroups ? (
                    <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading your groups...
                    </div>
                  ) : joinedGroups.length > 0 ? (
                    <div className="space-y-1.5">
                      {joinedGroups.map((group) => {
                        const isSent = sentGroupIds.has(group.id);
                        const isSending = sendingGroupId === group.id;
                        return (
                          <div
                            key={group.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                                {group.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate text-foreground">
                                  {group.name}
                                </p>
                                <p className="text-3xs text-muted-foreground">
                                  {group.member_count} member{group.member_count !== 1 ? "s" : ""} • #{group.kind}
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isSent ? "secondary" : "outline"}
                              className={cn(
                                "shrink-0 h-7 text-3xs px-2.5 gap-1 rounded-lg",
                                isSent && "text-green-600 dark:text-green-400 border-green-500/30",
                              )}
                              disabled={isSending || isSent}
                              onClick={() => handleSendToGroup(group)}
                            >
                              {isSending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isSent ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Sent
                                </>
                              ) : (
                                <>
                                  <Send className="h-2.5 w-2.5" />
                                  Share
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">You haven't joined any workspace groups yet.</p>
                      <Button size="sm" variant="outline" asChild className="text-2xs h-7">
                        <Link to="/workspace-groups" onClick={onClose}>
                          Join a campus group
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. Direct Messages Section */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 text-primary" />
                      Send via Direct Message
                    </span>
                    <Link to="/messages" className="text-3xs text-primary hover:underline" onClick={onClose}>
                      Open chat
                    </Link>
                  </div>

                  {conversations.length > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search chats..."
                        value={dmSearch}
                        onChange={(e) => setDmSearch(e.target.value)}
                        className="h-7.5 pl-8 text-xs bg-background/60"
                      />
                    </div>
                  )}

                  {isLoadingChats ? (
                    <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading chats...
                    </div>
                  ) : filteredConversations.length > 0 ? (
                    <div className="space-y-1.5">
                      {filteredConversations.slice(0, 5).map((conv) => {
                        const other = getOtherUser(conv);
                        const isSent = sentDmIds.has(conv.id);
                        const isSending = sendingDmId === conv.id;
                        const name = other?.name || "Student";

                        return (
                          <div
                            key={conv.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-7 w-7 border border-border/60 shrink-0">
                                <AvatarImage src={other?.profile_image || undefined} alt={name} />
                                <AvatarFallback className="text-3xs font-semibold bg-primary/10 text-primary">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate text-foreground">{name}</p>
                                <p className="text-3xs text-muted-foreground">
                                  Direct Message
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isSent ? "secondary" : "outline"}
                              className={cn(
                                "shrink-0 h-7 text-3xs px-2.5 gap-1 rounded-lg",
                                isSent && "text-green-600 dark:text-green-400 border-green-500/30",
                              )}
                              disabled={isSending || isSent}
                              onClick={() => handleSendToDm(conv)}
                            >
                              {isSending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isSent ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  Sent
                                </>
                              ) : (
                                <>
                                  <Send className="h-2.5 w-2.5" />
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">No recent direct conversations found.</p>
                      <Button size="sm" variant="outline" asChild className="text-2xs h-7">
                        <Link to="/messages" onClick={onClose}>
                          Start a new message
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* 3. Teammate Post on Campus Feed Shortcut */}
                <div className="pt-2 border-t border-border/50">
                  <Link
                    to={`/posts?compose=true&type=hackathon&tag=Hackathon%20Teammates&event_title=${encodeURIComponent(event.title)}&event_id=${event.id}`}
                    onClick={onClose}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-background to-transparent hover:border-violet-500/60 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-600 dark:text-violet-400">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Post to Campus Teammate Feed
                          </p>
                          <p className="text-3xs text-muted-foreground">
                            Find partners attending this event
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: EXTERNAL & FAST LINKS */}
          <TabsContent value="external" className="space-y-4 pt-3 mt-0 focus-visible:outline-none">
            {/* Quick action tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* WhatsApp Button */}
              <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/60 text-emerald-600 dark:text-emerald-400 rounded-xl"
                onClick={handleWhatsAppShare}
              >
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Share on WhatsApp</span>
              </Button>

              {/* Native OS Share Button */}
              <Button
                variant="outline"
                className="h-14 flex flex-col items-center justify-center gap-1 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 hover:border-violet-500/60 text-violet-600 dark:text-violet-400 rounded-xl"
                onClick={handleNativeShare}
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold">More Apps (OS)</span>
              </Button>
            </div>

            {/* Copy Link Input Bar */}
            <div className="space-y-1.5">
              <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                Event Link
              </label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={canonicalUrl}
                  className="text-xs h-9 bg-muted/40 border-border/80 font-mono select-all"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0 text-xs h-9 px-3 gap-1.5"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {/* QR Code Toggle for Desktop/Classroom Presentation */}
            <div className="pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-2 text-muted-foreground hover:text-foreground justify-center h-8"
                onClick={() => setShowQrCode(!showQrCode)}
              >
                <QrCode className="h-3.5 w-3.5" />
                {showQrCode ? "Hide QR Code" : "Show QR Code (Scan with phone)"}
              </Button>

              {showQrCode && (
                <div className="mt-3 flex flex-col items-center justify-center p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-2 rounded-xl bg-white shadow-sm">
                    <img
                      src={qrImageUrl}
                      alt={`QR Code for ${event.title}`}
                      className="h-40 w-40 object-contain rounded"
                    />
                  </div>
                  <p className="text-2xs text-muted-foreground text-center">
                    Scan with camera or Google Lens to open this event on mobile
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
