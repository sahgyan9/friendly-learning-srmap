import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Star,
  MessageSquare,
  CalendarPlus,
  Edit3,
  Trash2,
  Lock,
  ChevronDown,
  Check,
  Bell,
} from "lucide-react";
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
  "Excited for this workshop",
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
      eventTitle: event.title,
      eventStartDate: event.startDate || event.date,
      eventVenue: event.venue,
    });
    setActionLoading(false);

    if (error) {
      toast.error("RSVP failed", { description: error.message });
    } else {
      toast.success(
        status === "going"
          ? "Marked as going"
          : "Marked as interested",
        {
          description: "Classmates can see your RSVP. You'll get reminders 24 h and 2 h before.",
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
      eventTitle: event.title,
      eventStartDate: event.startDate || event.date,
      eventVenue: event.venue,
    });
    setActionLoading(false);

    if (error) {
      toast.error("Could not update note", { description: error.message });
    } else {
      toast.success("Note saved");
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
      toast.error("Could not cancel RSVP", { description: error.message });
    } else {
      toast.success("RSVP cancelled");
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

  const signInHref = `/signin?returnTo=${encodeURIComponent(window.location.pathname)}`;

  const rsvpToggle = (status: EventAttendanceStatus, label: string, count: number) => {
    const selected = myAttendance?.status === status;
    const Icon = status === "going" ? Check : Star;
    return (
      <button
        type="button"
        aria-pressed={selected}
        disabled={actionLoading}
        onClick={() => handleRsvpClick(status)}
        title={selected ? "Edit your note or cancel" : undefined}
        className={cn(
          "inline-flex h-10 flex-1 items-center justify-center gap-1.5 px-4 text-sm font-medium transition-colors duration-150 sm:flex-none",
          "focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-wait disabled:opacity-70",
          selected
            ? status === "going"
              ? "bg-emerald-600 text-white hover:bg-emerald-600/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card text-foreground hover:bg-accent",
        )}
      >
        <Icon className={cn("h-4 w-4", selected && status === "interested" && "fill-current")} aria-hidden />
        {label}
        {count > 0 && <span className="tabular opacity-75">{count}</span>}
      </button>
    );
  };

  const tabButton = (id: "all" | "going" | "interested", label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      onClick={() => setActiveTab(id)}
      className={cn(
        "-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors duration-150",
        activeTab === id
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="tabular text-xs text-muted-foreground">{count}</span>
    </button>
  );

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <CardTitle className="flex items-baseline gap-2 text-base font-semibold">
                Who's going
                <span className="tabular text-sm font-normal text-muted-foreground">
                  {attendees.length} {attendees.length === 1 ? "student" : "students"}
                </span>
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                See who else is attending and arrange to go together.
              </p>
            </div>

            {user ? (
              <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                <div className="flex items-center gap-2">
                  <div role="group" aria-label="Your RSVP" className="flex flex-1 divide-x overflow-hidden rounded-md border sm:flex-none">
                    {rsvpToggle("going", "Going", goingAttendees.length)}
                    {rsvpToggle("interested", "Interested", interestedAttendees.length)}
                  </div>

                  {myAttendance && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" aria-label="RSVP options">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedStatusForNote(myAttendance.status);
                            setCustomNote(myAttendance.note || "");
                            setIsNoteDialogOpen(true);
                          }}
                        >
                          <Edit3 className="mr-2 h-4 w-4" />
                          {myAttendance.note ? "Edit note" : "Add note"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={handleCancelRsvp}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Cancel RSVP
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {myAttendance && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Reminders 24 h and 2 h before
                  </span>
                )}
              </div>
            ) : (
              <Button asChild>
                <Link to={signInHref}>
                  <Lock className="h-4 w-4" />
                  Sign in to RSVP
                </Link>
              </Button>
            )}
          </div>

          {myAttendance && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <p className="min-w-0 text-muted-foreground">
                You're marked{" "}
                <strong className="font-medium text-foreground">
                  {myAttendance.status === "going" ? "going" : "interested"}
                </strong>
                {myAttendance.note && <span className="text-foreground/80"> · “{myAttendance.note}”</span>}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedStatusForNote(myAttendance.status);
                    setCustomNote(myAttendance.note || "");
                    setIsNoteDialogOpen(true);
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                  {myAttendance.note ? "Edit note" : "Add note"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <CalendarPlus className="h-4 w-4" />
                      Add to calendar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={getGoogleCalendarUrl(calendarData)} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                        Google Calendar
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={getOutlookCalendarUrl(calendarData)} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
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
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading attendees">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3.5">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Lock className="h-5 w-5" />
              </div>
              <div className="flex max-w-md flex-col gap-1">
                <h3 className="text-sm font-medium">
                  {attendees.length > 0
                    ? `${attendees.length} ${attendees.length === 1 ? "student is" : "students are"} attending`
                    : "See who is attending"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sign in with your university account to see attendees from your branch or batch and message them.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to={signInHref}>Sign in to view attendees</Link>
              </Button>
            </div>
          ) : attendees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex max-w-sm flex-col gap-1">
                <h3 className="text-sm font-medium">No one has RSVP'd yet</h3>
                <p className="text-sm text-muted-foreground">
                  Mark yourself going so classmates can find you and join.
                </p>
              </div>
              <Button onClick={() => handleRsvpClick("going")} isLoading={actionLoading}>
                <Check className="h-4 w-4" />
                I'm going
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-5 border-b" role="tablist" aria-label="Filter attendees">
                {tabButton("all", "All", attendees.length)}
                {tabButton("going", "Going", goingAttendees.length)}
                {tabButton("interested", "Interested", interestedAttendees.length)}
              </div>

              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredAttendees.map((attendee) => {
                  const isCurrentUser = user?.id === attendee.user_id;
                  const isChatting = startingChatUserId === attendee.user_id;

                  return (
                    <li
                      key={attendee.user_id}
                      className={cn(
                        "flex min-w-0 flex-col gap-3 rounded-lg border p-3.5",
                        isCurrentUser ? "border-primary/30 bg-primary/5" : "bg-card",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0 border">
                          {attendee.profile_image && (
                            <AvatarImage src={attendee.profile_image} alt={attendee.name} />
                          )}
                          <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                            {getInitials(attendee.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-foreground">{attendee.name}</span>
                            {attendee.is_mentor && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-2xs font-medium">
                                Mentor
                              </Badge>
                            )}
                            {isCurrentUser && <span className="text-xs text-muted-foreground">(you)</span>}
                          </div>

                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            {attendee.department && <span className="truncate">{attendee.department}</span>}
                            {attendee.department && <span aria-hidden>·</span>}
                            <span
                              className={cn(
                                "shrink-0 font-medium",
                                attendee.status === "going" ? "text-emerald-700 dark:text-emerald-400" : "text-foreground",
                              )}
                            >
                              {attendee.status === "going" ? "Going" : "Interested"}
                            </span>
                          </div>
                        </div>

                        {!isCurrentUser && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="-mr-1.5 -mt-1.5 shrink-0"
                            isLoading={isChatting}
                            aria-label={`Message ${attendee.name}`}
                            title={`Message ${attendee.name}`}
                            onClick={() => handleStartMessage(attendee.user_id, attendee.name)}
                          >
                            {!isChatting && <MessageSquare className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>

                      {attendee.note && (
                        <p className="line-clamp-2 border-l-2 pl-2.5 text-sm leading-relaxed text-foreground/90">
                          {attendee.note}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your RSVP</DialogTitle>
            <DialogDescription>
              Add a short note so classmates know why you're going or that you're looking for a team.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground" id="rsvp-status-label">Status</span>
              <div role="group" aria-labelledby="rsvp-status-label" className="grid grid-cols-2 divide-x overflow-hidden rounded-md border">
                {(["going", "interested"] as const).map((status) => {
                  const selected = selectedStatusForNote === status;
                  const Icon = status === "going" ? Check : Star;
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedStatusForNote(status)}
                      className={cn(
                        "inline-flex h-10 items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-150",
                        selected
                          ? status === "going"
                            ? "bg-emerald-600 text-white"
                            : "bg-primary text-primary-foreground"
                          : "bg-card hover:bg-accent",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", selected && status === "interested" && "fill-current")} />
                      {status === "going" ? "Going" : "Interested"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Suggestions</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomNote(preset)}
                    className="rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="rsvp-note" className="text-sm font-medium text-foreground">
                  Note <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <span className={cn("tabular text-xs", customNote.length >= 130 ? "text-foreground" : "text-muted-foreground")}>
                  {customNote.length}/150
                </span>
              </div>
              <Textarea
                id="rsvp-note"
                placeholder="e.g. Looking for a team for the competition"
                value={customNote}
                maxLength={150}
                onChange={(e) => setCustomNote(e.target.value)}
                className="min-h-[72px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
            {myAttendance && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={actionLoading}
                onClick={handleCancelRsvp}
              >
                <Trash2 className="h-4 w-4" />
                Cancel RSVP
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                Close
              </Button>
              <Button type="button" isLoading={actionLoading} onClick={handleSaveNote}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
