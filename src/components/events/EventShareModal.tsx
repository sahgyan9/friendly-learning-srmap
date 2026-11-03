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
import { parseEventDate } from "@/lib/calendar-utils";
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
    const start = parseEventDate(event.startDate);
    const end = parseEventDate(event.endDate);

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
    return `*${event.title}*
${formattedDate} (${formattedTime})
Venue: ${event.venue || "SRM University-AP Campus"}
${canonicalUrl}`;
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
    toast.success("Link copied");
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
        toast.success("Shared");
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
      toast.error("Sign in to share to groups");
      return;
    }

    setSendingGroupId(group.id);
    try {
      const messageContent = `**Campus event**\n\n${richShareText}`;
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
      toast.error("Sign in to send direct messages");
      return;
    }

    setSendingDmId(conv.id);
    try {
      const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const messageContent = `**Campus event**\n\n${richShareText}`;
      const { error } = await sendMessage(conv.id, user.id, otherUserId, messageContent);
      if (error) throw error;

      setSentDmIds((prev) => new Set([...prev, conv.id]));
      toast.success("Message sent");
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
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="border-b p-5 pb-4 text-left">
          <DialogTitle className="text-base font-semibold">Share event</DialogTitle>
          <DialogDescription asChild>
            <div className="flex min-w-0 flex-col gap-0.5 pr-6">
              <span className="truncate font-medium text-foreground">{event.title}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="tabular shrink-0">{formattedDate}</span>
                <span aria-hidden>·</span>
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{event.venue || "SRMAP Campus"}</span>
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Tabs: In-App Campus Share vs Fast Actions */}
        <Tabs defaultValue="in-app" className="w-full px-5 pt-4 pb-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in-app" className="gap-1.5">
              <Users className="h-4 w-4" />
              In the app
            </TabsTrigger>
            <TabsTrigger value="external" className="gap-1.5">
              <Share2 className="h-4 w-4" />
              Link and apps
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: IN-APP SHARING (Workspace Groups + Direct Messages) */}
          <TabsContent value="in-app" className="space-y-4 pt-3 mt-0 focus-visible:outline-none">
            {!user ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in to send this event to your community groups and direct messages.
                </p>
                <Button size="sm" asChild>
                  <Link to="/signin">Sign in to share</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {/* 1. Workspace Groups Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Your groups
                    </span>
                    <Link
                      to="/workspace-groups"
                      className="text-xs text-primary hover:underline"
                      onClick={onClose}
                    >
                      Browse all
                    </Link>
                  </div>

                  {isLoadingGroups ? (
                    <div className="space-y-1.5" aria-busy="true" aria-label="Loading groups">
                      {[0, 1].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                      ))}
                    </div>
                  ) : joinedGroups.length > 0 ? (
                    <div className="space-y-1.5">
                      {joinedGroups.map((group) => {
                        const isSent = sentGroupIds.has(group.id);
                        const isSending = sendingGroupId === group.id;
                        return (
                          <div
                            key={group.id}
                            className="flex items-center justify-between gap-3 rounded-md border p-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                                {group.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate text-foreground">
                                  {group.name}
                                </p>
                                <p className="text-3xs text-muted-foreground">
                                  {group.member_count} member{group.member_count !== 1 ? "s" : ""} · {group.kind}
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isSent ? "secondary" : "outline"}
                              className={cn(
                                "shrink-0 h-8 px-2.5 text-xs",
                                isSent && "text-emerald-700 dark:text-emerald-400",
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
                                  <Send className="h-3.5 w-3.5" />
                                  Share
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-center space-y-2">
                      <p className="text-xs text-muted-foreground">You have not joined any groups yet.</p>
                      <Button size="sm" variant="outline" asChild className="text-2xs h-7">
                        <Link to="/workspace-groups" onClick={onClose}>
                          Browse communities
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* 2. Direct Messages Section */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Direct messages
                    </span>
                    <Link to="/messages" className="text-xs text-primary hover:underline" onClick={onClose}>
                      Open chat
                    </Link>
                  </div>

                  {conversations.length > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search chats"
                        value={dmSearch}
                        onChange={(e) => setDmSearch(e.target.value)}
                        className="h-7.5 pl-8 text-xs bg-background/60"
                      />
                    </div>
                  )}

                  {isLoadingChats ? (
                    <div className="space-y-1.5" aria-busy="true" aria-label="Loading chats">
                      {[0, 1].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                      ))}
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
                            className="flex items-center justify-between gap-3 rounded-md border p-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-7 w-7 border border-border/60 shrink-0">
                                <AvatarImage src={other?.profile_image || undefined} alt={name} />
                                <AvatarFallback className="text-3xs font-semibold bg-secondary text-secondary-foreground">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate text-foreground">{name}</p>
                                <p className="text-3xs text-muted-foreground">
                                  Direct Message
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={isSent ? "secondary" : "outline"}
                              className={cn(
                                "shrink-0 h-8 px-2.5 text-xs",
                                isSent && "text-emerald-700 dark:text-emerald-400",
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
                                  <Send className="h-3.5 w-3.5" />
                                  Send
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4 text-center space-y-2">
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
                    <div className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors duration-150 hover:bg-accent">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Flame className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Post a teammate request
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Find partners attending this event
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                className="h-11"
                onClick={handleWhatsAppShare}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>

              {/* Native OS Share Button */}
              <Button
                variant="outline"
                className="h-11"
                onClick={handleNativeShare}
              >
                <Share2 className="h-4 w-4" />
                Other apps
              </Button>
            </div>

            {/* Copy Link Input Bar */}
            <div className="space-y-1.5">
              <label htmlFor="event-share-link" className="text-sm font-medium text-foreground">
                Event link
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="event-share-link"
                  readOnly
                  value={canonicalUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 bg-muted font-mono text-xs"
                />
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {/* QR Code Toggle for Desktop/Classroom Presentation */}
            <div className="pt-2 border-t border-border/60">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                aria-expanded={showQrCode}
                onClick={() => setShowQrCode(!showQrCode)}
              >
                <QrCode className="h-4 w-4" />
                {showQrCode ? "Hide QR code" : "Show QR code"}
              </Button>

              {showQrCode && (
                <div className="mt-3 flex flex-col items-center justify-center gap-2.5 rounded-lg border p-4 animate-fade-in">
                  <div className="rounded-md bg-white p-2">
                    <img
                      src={qrImageUrl}
                      alt={`QR Code for ${event.title}`}
                      className="h-40 w-40 object-contain rounded"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan with a phone camera to open this event
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
