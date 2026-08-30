import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  Star,
  MessageSquare,
  Sparkles,
  CalendarPlus,
  Edit3,
  Trash2,
  Lock,
  ChevronDown,
  Loader2,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { SRMAPEvent } from "@/hooks/useSRMAPEvents";
import {
  getEventAttendees,
  setEventAttendance,
  removeEventAttendance,
  EventAttendee,
  EventAttendanceStatus,
} from "@/integrations/supabase/services/event-attendees";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadIcsFile,
} from "@/lib/calendar-utils";
import { getInitials } from "@/utils/user-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventAttendeeRosterProps {
  event: SRMAPEvent;
}

const QUICK_NOTE_PRESETS = [
  "Looking for hackathon teammates",
  "Heading together from UB / Hostels",
  "First time attending, would love company",
  "Excited for this workshop!",
];

export const EventAttendeeRoster: React.FC<EventAttendeeRosterProps> = ({ event }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [myAttendance, setMyAttendance] = useState<EventAttendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null);

  // Tab filter: 'all' | 'going' | 'interested'
  const [activeTab, setActiveTab] = useState<"all" | "going" | "interested">("all");

  // Note dialog state
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedStatusForNote, setSelectedStatusForNote] = useState<EventAttendanceStatus>("going");
  const [customNote, setCustomNote] = useState("");

  const eventNumericId = Number(event.id);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    const { data, myAttendance: myAtt, error } = await getEventAttendees(eventNumericId);
    if (!error) {
      setAttendees(data);
      setMyAttendance(myAtt);
    }
    setLoading(false);
  }, [eventNumericId]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const goingAttendees = useMemo(
    () => attendees.filter((a) => a.status === "going"),
    [attendees]
  );
  const interestedAttendees = useMemo(
    () => attendees.filter((a) => a.status === "interested"),
    [attendees]
  );

  const filteredAttendees = useMemo(() => {
    if (activeTab === "going") return goingAttendees;
    if (activeTab === "interested") return interestedAttendees;
    return attendees;
  }, [activeTab, attendees, goingAttendees, interestedAttendees]);

  const handleRsvpClick = async (status: EventAttendanceStatus) => {
    if (!user) {
      toast.error("Sign in required", {
        description: "Please sign in with your SRM AP account to RSVP.",
      });
      return;
    }

    // If clicking same status, open note editor
    if (myAttendance && myAttendance.status === status) {
      setSelectedStatusForNote(status);
      setCustomNote(myAttendance.note || "");
      setIsNoteDialogOpen(true);
      return;
    }

    setActionLoading(true);
    const { error } = await setEventAttendance({
      eventId: eventNumericId,
      status,
      note: myAttendance?.note || null,
    });
    setActionLoading(false);

    if (error) {
      toast.error("RSVP Failed", { description: error.message });
    } else {
      toast.success(
        status === "going"
          ? "You're marked as Going! 🎉"
          : "You're marked as Interested! ⭐",
        {
          description: "Peers can now see you're attending.",
        }
      );
      await fetchRoster();
    }
  };

  const handleSaveNote = async () => {
    if (!user) return;
    setActionLoading(true);
    const { error } = await setEventAttendance({
      eventId: eventNumericId,
      status: selectedStatusForNote,
      note: customNote,
    });
    setActionLoading(false);

    if (error) {
      toast.error("Could not update note", { description: error.message });
    } else {
      toast.success("Attendance note updated!");
      setIsNoteDialogOpen(false);
      await fetchRoster();
    }
  };

  const handleCancelRsvp = async () => {
    if (!user) return;
    setActionLoading(true);
    const { error } = await removeEventAttendance(eventNumericId);
    setActionLoading(false);

    if (error) {
      toast.error("Failed to cancel RSVP", { description: error.message });
    } else {
      toast.success("RSVP cancelled.");
      setIsNoteDialogOpen(false);
      await fetchRoster();
    }
  };

  const handleStartMessage = async (targetUserId: string, targetName: string) => {
    if (!user) {
      toast.error("Sign in to message attendees");
      return;
    }
    if (user.id === targetUserId) return;

    try {
      setStartingChatUserId(targetUserId);
      const { data: conversation, error } = await getOrCreateConversation(user.id, targetUserId);

      if (error || !conversation) {
        toast.error("Could not start conversation", {
          description: error?.message || "Please try again.",
        });
        return;
      }

      toast.success(`Opening chat with ${targetName}`);
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      console.error("Error starting chat:", err);
      toast.error("Error opening chat");
    } finally {
      setStartingChatUserId(null);
    }
  };

  const calendarData = useMemo(() => {
    return {
      title: event.title,
      description: event.excerpt || event.title,
      location: event.venue || "SRM University-AP Campus",
      startDate: event.startDate,
      endDate: event.endDate,
    };
  }, [event]);

  return (
    <>
      <Card className="border-border/70 shadow-sm overflow-hidden bg-card">
        {/* Header Bar */}
        <CardHeader className="p-5 pb-4 border-b border-border/50 bg-gradient-to-r from-violet-500/5 via-background to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold tracking-tight">
                    Who's Going
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold">
                    {attendees.length} {attendees.length === 1 ? "student" : "students"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  See peers attending this event and coordinate to go together
                </p>
              </div>
            </div>

            {/* RSVP Controls for Signed-in User */}
            {user ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={myAttendance?.status === "going" ? "default" : "outline"}
                  className={cn(
                    "text-xs gap-1.5 h-8 font-medium transition-all",
                    myAttendance?.status === "going"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  )}
                  disabled={actionLoading}
                  onClick={() => handleRsvpClick("going")}
                >
                  {myAttendance?.status === "going" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  <span>Going</span>
                  {goingAttendees.length > 0 && (
                    <span className="opacity-75 tabular-nums">({goingAttendees.length})</span>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant={myAttendance?.status === "interested" ? "default" : "outline"}
                  className={cn(
                    "text-xs gap-1.5 h-8 font-medium transition-all",
                    myAttendance?.status === "interested"
                      ? "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                      : "border-border/80 hover:border-violet-500/50 hover:bg-violet-500/5"
                  )}
                  disabled={actionLoading}
                  onClick={() => handleRsvpClick("interested")}
                >
                  <Star className="h-3.5 w-3.5" />
                  <span>Interested</span>
                  {interestedAttendees.length > 0 && (
                    <span className="opacity-75 tabular-nums">({interestedAttendees.length})</span>
                  )}
                </Button>

                {myAttendance && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedStatusForNote(myAttendance.status);
                          setCustomNote(myAttendance.note || "");
                          setIsNoteDialogOpen(true);
                        }}
                      >
                        <Edit3 className="mr-2 h-3.5 w-3.5" />
                        {myAttendance.note ? "Edit note" : "Add note"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={handleCancelRsvp}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Cancel RSVP
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              <Link to={`/signin?returnTo=${encodeURIComponent(window.location.pathname)}`}>
                <Button size="sm" className="text-xs bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-8">
                  <Lock className="h-3.5 w-3.5" />
                  Sign in to RSVP
                </Button>
              </Link>
            )}
          </div>

          {/* Active User Attendance Status Strip & Calendar Quick Action */}
          {myAttendance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-muted-foreground">
                  You are marked as{" "}
                  <strong className="text-foreground capitalize">{myAttendance.status}</strong>
                  {myAttendance.note && (
                    <span className="italic ml-1 text-foreground/80">
                      — “{myAttendance.note}”
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => {
                    setSelectedStatusForNote(myAttendance.status);
                    setCustomNote(myAttendance.note || "");
                    setIsNoteDialogOpen(true);
                  }}
                >
                  <Edit3 className="h-3 w-3" />
                  {myAttendance.note ? "Edit note" : "Add note"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 px-2"
                    >
                      <CalendarPlus className="h-3 w-3" />
                      Add to Calendar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem asChild>
                      <a
                        href={getGoogleCalendarUrl(calendarData)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        Google Calendar
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={getOutlookCalendarUrl(calendarData)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        Outlook Calendar
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => downloadIcsFile(calendarData, `${event.title.slice(0, 20)}.ics`)}
                      className="cursor-pointer"
                    >
                      Apple / iCal (.ics file)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          )}
        </CardHeader>

        {/* Content Body */}
        <CardContent className="p-5">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600 dark:text-violet-400" />
              <p className="text-xs text-muted-foreground">Loading attendee list...</p>
            </div>
          ) : !user ? (
            /* Logged-out teaser state */
            <div className="rounded-xl border border-dashed border-border/80 p-6 text-center bg-muted/20">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-3">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold mb-1">
                {attendees.length > 0
                  ? `${attendees.length} ${attendees.length === 1 ? "student is" : "students are"} attending this event`
                  : "Connect with students going to this event"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                Sign in with your university account to see who from your branch or batch is attending,
                share notes, and message classmates to go together.
              </p>
              <Link to={`/signin?returnTo=${encodeURIComponent(window.location.pathname)}`}>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5">
                  Sign in to view attendees
                </Button>
              </Link>
            </div>
          ) : attendees.length === 0 ? (
            /* Empty state for logged in user */
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/20">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold mb-1">Be the first to RSVP!</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                Let your peers know you're heading to this event so classmates can join you.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  onClick={() => handleRsvpClick("going")}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  I'm Going
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => handleRsvpClick("interested")}
                >
                  <Star className="h-3.5 w-3.5" />
                  Interested
                </Button>
              </div>
            </div>
          ) : (
            /* Active attendee roster */
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                    activeTab === "all"
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({attendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("going")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                    activeTab === "going"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Going ({goingAttendees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("interested")}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-medium transition-colors",
                    activeTab === "interested"
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Interested ({interestedAttendees.length})
                </button>
              </div>

              {/* Attendee Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredAttendees.map((attendee) => {
                  const isCurrentUser = user?.id === attendee.user_id;
                  const isChatting = startingChatUserId === attendee.user_id;

                  return (
                    <div
                      key={attendee.user_id}
                      className={cn(
                        "group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200",
                        isCurrentUser
                          ? "border-violet-500/30 bg-violet-500/5"
                          : "border-border/60 bg-card hover:border-border hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0 border border-border/50">
                          {attendee.profile_image && (
                            <AvatarImage src={attendee.profile_image} alt={attendee.name} />
                          )}
                          <AvatarFallback className="text-xs font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-300">
                            {getInitials(attendee.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate text-foreground">
                              {attendee.name}
                            </span>
                            {attendee.is_mentor && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[10px] border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
                              >
                                Mentor
                              </Badge>
                            )}
                            {isCurrentUser && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                (You)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            {attendee.department && (
                              <span>{attendee.department}</span>
                            )}
                            {attendee.department && <span>•</span>}
                            <span
                              className={cn(
                                "font-medium capitalize",
                                attendee.status === "going"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-violet-600 dark:text-violet-400"
                              )}
                            >
                              {attendee.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Attendee Note Bubble if provided */}
                      {attendee.note && (
                        <div className="mt-2.5 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-foreground/90 border border-border/40">
                          <p className="line-clamp-2 leading-relaxed text-[11px]">
                            💬 “{attendee.note}”
                          </p>
                        </div>
                      )}

                      {/* Action Row */}
                      {!isCurrentUser && (
                        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:text-violet-700 px-2.5"
                            disabled={isChatting}
                            onClick={() => handleStartMessage(attendee.user_id, attendee.name)}
                          >
                            {isChatting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <MessageSquare className="h-3 w-3" />
                            )}
                            <span>Message</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Customization Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Customize Your Attendance
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add a quick status note to let classmates know why you're going or if you're looking for partners.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedStatusForNote === "going" ? "default" : "outline"}
                  className={cn(
                    "text-xs gap-1.5 h-8",
                    selectedStatusForNote === "going" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                  onClick={() => setSelectedStatusForNote("going")}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Going
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedStatusForNote === "interested" ? "default" : "outline"}
                  className={cn(
                    "text-xs gap-1.5 h-8",
                    selectedStatusForNote === "interested" && "bg-violet-600 hover:bg-violet-700 text-white"
                  )}
                  onClick={() => setSelectedStatusForNote("interested")}
                >
                  <Star className="h-3.5 w-3.5" />
                  Interested
                </Button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Quick Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomNote(preset)}
                    className="text-[11px] rounded-full border border-border/80 bg-muted/40 hover:bg-muted px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Your Note <span className="text-muted-foreground font-normal">(optional, max 150 chars)</span>
              </label>
              <Textarea
                placeholder="e.g., Looking for a team for the competition..."
                value={customNote}
                maxLength={150}
                onChange={(e) => setCustomNote(e.target.value)}
                className="text-xs min-h-[70px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
            {myAttendance && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10"
                disabled={actionLoading}
                onClick={handleCancelRsvp}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Cancel RSVP
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsNoteDialogOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-violet-600 hover:bg-violet-700 text-white"
                disabled={actionLoading}
                onClick={handleSaveNote}
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
