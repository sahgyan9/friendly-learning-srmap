import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  GraduationCap,
  Users,
  Building2,
  MapPin,
  Clock,
  BadgeCheck,
  ChevronRight,
  MessageCircle,
  Star,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EventsIcon } from "@/components/icons/EventsIcon";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseEventDate } from "@/lib/calendar-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { useAuth } from "@/context/AuthContext";
import { useSRMAPEvents, type SRMAPEvent } from "@/hooks/useSRMAPEvents";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { getFacultyList, type Faculty } from "@/integrations/supabase/services/faculty";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import { listCommunities, type Community } from "@/integrations/supabase/services/communities";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { sampleMentors } from "@/data/mentors";
import type { Mentor } from "@/types/mentor";

const sampleFacultyFallback: Faculty[] = [
  {
    id: "f1",
    slug: "dr-murali-krishna-enduri",
    name: "Dr. Murali Krishna Enduri",
    designation: "Associate Professor",
    department: "Computer Science and Engineering",
    school: "School of Engineering and Sciences",
    profile_url: "https://www.srmap.edu.in/faculty/dr-murali-krishna-enduri/",
    image_url: null,
    has_image: false,
    interests: ["Machine Learning", "Graph Theory", "Algorithms"],
    research_areas: ["Artificial Intelligence"],
    rating_count: 24,
    avg_overall: 4.9,
    avg_teaching: 4.9,
    avg_grading: 4.8,
    avg_helpfulness: 5.0,
    office_location: "Admin Block, 3rd Floor",
  },
  {
    id: "f2",
    slug: "dr-priyanka-singh",
    name: "Dr. Priyanka Singh",
    designation: "Assistant Professor",
    department: "Computer Science and Engineering",
    school: "School of Engineering and Sciences",
    profile_url: "https://www.srmap.edu.in/faculty/dr-priyanka-singh/",
    image_url: null,
    has_image: false,
    interests: ["Deep Learning", "Computer Vision", "NLP"],
    research_areas: ["Computer Vision"],
    rating_count: 19,
    avg_overall: 4.8,
    avg_teaching: 4.8,
    avg_grading: 4.7,
    avg_helpfulness: 4.9,
    office_location: "Academic Block, Room 402",
  },
  {
    id: "f3",
    slug: "dr-ranjit-thapa",
    name: "Dr. Ranjit Thapa",
    designation: "Professor & HoD",
    department: "Physics",
    school: "School of Engineering and Sciences",
    profile_url: "https://www.srmap.edu.in/faculty/dr-ranjit-thapa/",
    image_url: null,
    has_image: false,
    interests: ["Computational Materials", "Quantum Mechanics", "DFT"],
    research_areas: ["Materials Science"],
    rating_count: 31,
    avg_overall: 4.9,
    avg_teaching: 5.0,
    avg_grading: 4.8,
    avg_helpfulness: 4.9,
    office_location: "Research Wing, 2nd Floor",
  },
];

const EventSpeakerPhoto = ({
  src,
  title,
  isLive,
  size = "sm",
  className,
}: {
  src?: string | null;
  title: string;
  isLive?: boolean;
  size?: "sm" | "md";
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const imageSrc = src && !failed ? getOptimizedImageUrl(src, { width: size === "md" ? 200 : 160, quality: 80 }) : null;
  const dimensionClass = size === "md" ? "h-14 w-14 rounded-xl" : "h-12 w-12 rounded-xl";
  const iconClass = size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className={cn("relative shrink-0 mt-0.5", className)}>
      <div className={cn(dimensionClass, "flex items-center justify-center overflow-hidden border border-border bg-secondary")}>
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={title || "Event Speaker / Featured"}
              className={cn(
                "h-full w-full object-cover object-top transition-opacity duration-150",
                loaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
            {!loaded && (
              <Skeleton className="absolute inset-0 rounded-none" />
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <GraduationCap className={iconClass} />
          </div>
        )}
      </div>

      {/* The one place a ping is earned: the event is happening right now */}
      {isLive && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3" title="Happening now">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-background bg-green-500" />
        </span>
      )}
    </div>
  );
};

function formatEventTiming(startVal: string | undefined, endVal?: string | undefined): {
  month: string;
  day: string;
  formattedDate: string;
  time: string;
  isLive: boolean;
} {
  if (!startVal) return { month: "UPC", day: "--", formattedDate: "Upcoming", time: "", isLive: false };
  try {
    const start = parseEventDate(startVal);
    if (isNaN(start.getTime())) return { month: "UPC", day: "--", formattedDate: "Upcoming", time: "", isLive: false };
    
    const month = start.toLocaleDateString("en-US", { month: "short" });
    const day = start.toLocaleDateString("en-US", { day: "numeric" });
    const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    
    const now = new Date();
    let isLive = false;
    let formattedDate = `${month} ${day}`;

    if (endVal) {
      const end = parseEventDate(endVal);
      if (!isNaN(end.getTime())) {
        isLive = now >= start && now <= end;
        if (start.toDateString() !== end.toDateString()) {
          const endMonth = end.toLocaleDateString("en-US", { month: "short" });
          const endDay = end.toLocaleDateString("en-US", { day: "numeric" });
          formattedDate = month === endMonth ? `${month} ${day} – ${endDay}` : `${month} ${day} – ${endMonth} ${endDay}`;
        }
      }
    } else {
      isLive = start.toDateString() === now.toDateString();
    }

    return { month, day, formattedDate, time, isLive };
  } catch {
    return { month: "UPC", day: "--", formattedDate: "Upcoming", time: "", isLive: false };
  }
}

const TOP_DEPARTMENTS = [
  { name: "Computer Science and Engineering", short: "CSE" },
  { name: "Electronics and Communication Engineering", short: "ECE" },
  { name: "Mechanical Engineering", short: "ME" },
  { name: "Management", short: "Paari" },
];

export const CampusSidebarWidgets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const { events, loading: eventsLoading } = useSRMAPEvents();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [groups, setGroups] = useState<Community[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [facultyLoading, setFacultyLoading] = useState(true);

  const handleConnect = async (mentor: Mentor, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Sign in to message mentors");
      navigate("/signin");
      return;
    }

    if (mentor.id === user.id) {
      toast.error("You cannot message yourself");
      return;
    }

    setConnectingId(mentor.id);
    try {
      const { data: conversation, error } = await getOrCreateConversation(user.id, mentor.id);
      if (error || !conversation) {
        toast.error("Could not start a conversation. Opening the mentor profile instead.");
        navigate(`/mentor/${mentor.slug || mentor.id}`);
        return;
      }
      toast.success(`Conversation with ${mentor.name} opened`);
      navigate(`/messages/${conversation.id}`);
    } catch {
      navigate(`/mentor/${mentor.slug || mentor.id}`);
    } finally {
      setConnectingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    getMentors().then(({ data }) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        setMentors(data.slice(0, 3));
      } else {
        setMentors(sampleMentors.slice(0, 3));
      }
      setMentorsLoading(false);
    });

    getFacultyList({ sort: "reviews", limit: 3 }).then(({ data }) => {
      if (cancelled) return;
      if (data && data.length > 0) {
        setFaculty(data.slice(0, 3));
      } else {
        setFaculty(sampleFacultyFallback);
      }
      setFacultyLoading(false);
    });

    listCommunities({ limit: 3 }).then(({ data }) => {
      if (cancelled) return;
      if (data) {
        setGroups(data.slice(0, 3));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Widget 1: Upcoming Events ── */}
      <Card className="p-4 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-border bg-secondary p-1.5 text-muted-foreground">
              <EventsIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Upcoming events</h3>
          </div>
          <Link
            to="/events"
            className="inline-flex min-h-[32px] items-center gap-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {eventsLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-2.5">
            {events.slice(0, 3).map((event) => {
              const { formattedDate, time, isLive } = formatEventTiming(event.startDate, event.endDate);
              return (
                <Tooltip key={event.id}>
                  <TooltipTrigger asChild>
                    <Link
                      to={`/events/${event.id}`}
                      className="group flex items-start gap-3 rounded-lg border border-border p-2.5 transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
                    >
                      {/* Speaker Photo / Featured Event Thumbnail */}
                      <EventSpeakerPhoto
                        src={event.imageUrl}
                        title={event.title}
                        isLive={isLive}
                      />

                      {/* Event Details */}
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                          {event.title}
                        </h4>

                        {/* Date, Time & Venue below heading */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground mt-1">
                          <span className="tabular inline-flex shrink-0 items-center gap-1 font-medium text-foreground">
                            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
                            {formattedDate}
                          </span>
                          {time && time !== "12:00 AM" && (
                            <span className="tabular inline-flex shrink-0 items-center gap-1">
                              <Clock className="h-3 w-3 shrink-0" />
                              {time}
                            </span>
                          )}
                          {event.venue && (
                            <span className="inline-flex w-full min-w-0 items-center gap-1 truncate sm:w-auto">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    sideOffset={12}
                    className="z-50 max-w-sm rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-float"
                  >
                    <div className="space-y-3">
                      {/* Badges */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Campus event</span>
                        {isLive && (
                          <span className="inline-flex items-center gap-1.5 rounded bg-green-500/10 px-1.5 py-0.5 text-3xs font-semibold text-green-700 dark:text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Happening now
                          </span>
                        )}
                        {event.department && (
                          <Badge variant="secondary" className="rounded px-1.5 py-0.5 text-3xs font-medium">
                            {event.department.split(" ")[0]}
                          </Badge>
                        )}
                      </div>

                      {/* Speaker Photo + Title row */}
                      <div className="flex items-start gap-3">
                        <EventSpeakerPhoto
                          src={event.imageUrl}
                          title={event.title}
                          isLive={isLive}
                          size="md"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-sm font-semibold leading-snug tracking-tight text-foreground">
                            {event.title}
                          </h3>
                          {/* Date directly below heading */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="tabular inline-flex items-center gap-1 font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {formattedDate}
                            </span>
                            {time && time !== "12:00 AM" && (
                              <span className="tabular inline-flex shrink-0 items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Location & Organizer strip */}
                      {(event.venue || event.organizer) && (
                        <div className="space-y-1.5 border-t border-border pt-2 text-xs text-muted-foreground">
                          {event.venue && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="line-clamp-1">{event.venue}</span>
                            </div>
                          )}
                          {event.organizer && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="line-clamp-1">{event.organizer}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">No upcoming events are listed.</p>
        )}
      </Card>

      {/* ── Widget 2: Featured Senior Mentors ── */}
      <Card className="p-4 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-border bg-secondary p-1.5 text-muted-foreground">
              <MentorIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Featured mentors</h3>
          </div>
          <Link
            to="/mentors"
            className="inline-flex min-h-[32px] items-center gap-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            All mentors
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {mentorsLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {mentors.map((mentor) => {
              const hasRating = Boolean(mentor.rating && mentor.rating > 0 && mentor.review_count && mentor.review_count > 0);
              const isConnecting = connectingId === mentor.id;

              return (
                <Tooltip key={mentor.id}>
                  <TooltipTrigger asChild>
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MentorAvatar
                          name={mentor.name}
                          src={mentor.profile_image}
                          seed={mentor.id}
                          className="h-9 w-9 shrink-0 ring-1 ring-border text-xs"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/mentor/${mentor.slug || mentor.id}`}
                            className="flex items-center gap-1 truncate text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                          >
                            <span className="truncate">{mentor.name}</span>
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified mentor" />
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {mentor.department || "Senior mentor"}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={isConnecting}
                        onClick={(e) => handleConnect(mentor, e)}
                        className="h-8 shrink-0 px-3 text-xs"
                      >
                        Message
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    sideOffset={14}
                    className="z-50 w-[480px] max-w-[90vw] rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-float"
                  >
                    <div className="space-y-4">
                      {/* Top Row: Avatar + Details + Connect Button */}
                      <div className="flex items-start gap-4">
                        {/* Left: Avatar with Verified Badge */}
                        <div className="relative shrink-0">
                          <MentorAvatar
                            name={mentor.name}
                            src={mentor.profile_image}
                            seed={mentor.id}
                            className="h-16 w-16 rounded-xl border border-border object-cover"
                            fallbackClassName="rounded-xl text-xl font-semibold"
                          />
                        </div>

                        {/* Middle: Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <h4 className="truncate text-base font-semibold tracking-tight text-foreground">
                                {mentor.name}
                              </h4>
                              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified mentor" />
                            </div>
                            <Button
                              size="sm"
                              isLoading={isConnecting}
                              onClick={(e) => handleConnect(mentor, e)}
                              className="shrink-0"
                            >
                              {!isConnecting && <MessageCircle aria-hidden />}
                              Message
                            </Button>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {(mentor.department || "Senior")
                                .replace(/\[.*?\]/g, "")
                                .replace(/\(.*?\)/g, "")
                                .trim()}{" "}
                              Mentor
                            </span>
                            {" \u00b7 "}
                            <span>{mentor.university || "SRM University AP"}</span>
                          </p>

                          {(mentor.tagline || mentor.bio) && (
                            <p className="line-clamp-2 pt-1.5 text-xs leading-relaxed text-foreground">
                              &ldquo;{mentor.tagline || mentor.bio}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Trust Metrics Grid Bar */}
                      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                        {/* Metric 1: Rating */}
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary p-2.5">
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                          <div className="min-w-0">
                            <div className="tabular text-xs font-semibold text-foreground">
                              {hasRating ? (
                                <>
                                  {mentor.rating.toFixed(1)}
                                  <span className="text-3xs text-muted-foreground font-normal ml-1">
                                    ({mentor.review_count})
                                  </span>
                                </>
                              ) : (
                                "New"
                              )}
                            </div>
                            <div className="text-3xs text-muted-foreground">
                              {hasRating ? "Rating" : "No reviews yet"}
                            </div>
                          </div>
                        </div>

                        {/* Metric 2: Reviews */}
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary p-2.5">
                          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <div className="tabular text-xs font-semibold text-foreground">
                              {mentor.review_count && mentor.review_count > 0 ? mentor.review_count : "New"}
                            </div>
                            <div className="text-3xs text-muted-foreground">
                              {mentor.review_count && mentor.review_count > 0 ? "Peer reviews" : "No reviews yet"}
                            </div>
                          </div>
                        </div>

                        {/* Metric 3: Response Rate */}
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary p-2.5">
                          <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground">Open</div>
                            <div className="text-3xs text-muted-foreground">Direct messages</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Widget 3: Faculty Explorer Spotlight ── */}
      <Card className="p-4 shadow-card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-border bg-secondary p-1.5 text-muted-foreground">
              <FacultyIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Faculty</h3>
          </div>
          <Link
            to="/faculty"
            className="inline-flex min-h-[32px] items-center gap-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            All faculty
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {facultyLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {faculty.map((member) => {
              const hasRating = Boolean(member.rating_count && member.rating_count > 0 && member.avg_overall && member.avg_overall > 0);
              const interests = member.interests ?? [];

              return (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
                          {member.image_url ? (
                            <img
                              src={getOptimizedImageUrl(member.image_url, { width: 100, quality: 75 })}
                              alt={member.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover object-top"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/faculty/${member.slug}`}
                            className="flex items-center gap-1 truncate text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline"
                          >
                            <span className="truncate">{member.name}</span>
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.designation ? `${member.designation} \u00b7 ` : ""}{member.department}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasRating && (
                          <div className="tabular hidden items-center gap-1 text-xs font-medium text-foreground xs:flex">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                            {Number(member.avg_overall).toFixed(1)}
                          </div>
                        )}
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                        >
                          <Link to={`/faculty/${member.slug}`}>
                            {hasRating ? "Reviews" : "Rate"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    sideOffset={14}
                    className="z-50 w-[480px] max-w-[90vw] rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-float"
                  >
                    <div className="space-y-4">
                      {/* Top Row: Photo + Details + View Profile Button */}
                      <div className="flex items-start gap-4">
                        {/* Left: Faculty Photo with Rose Badge */}
                        <div className="relative shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary">
                            {member.image_url ? (
                              <img
                                src={getOptimizedImageUrl(member.image_url, { width: 200, quality: 80 })}
                                alt={member.name}
                                className="h-full w-full object-cover object-top"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <UserRound className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Middle: Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="truncate text-base font-semibold tracking-tight text-foreground">
                              {member.name}
                            </h4>
                            <Button asChild size="sm" className="shrink-0">
                              <Link to={`/faculty/${member.slug}`}>
                                {hasRating ? "Read reviews" : "Rate"}
                              </Link>
                            </Button>
                          </div>

                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {member.designation || "Professor"}
                            </span>
                            {" \u00b7 "}
                            <span>{member.department}</span>
                          </p>

                          {interests.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {interests.slice(0, 3).map((interest) => (
                                <span
                                  key={interest}
                                  className="max-w-[140px] truncate rounded bg-secondary px-1.5 py-0.5 text-3xs text-secondary-foreground"
                                >
                                  {interest}
                                </span>
                              ))}
                              {interests.length > 3 && (
                                <span className="tabular text-3xs text-muted-foreground">+{interests.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Trust & Feedback Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                        {/* Metric 1: Overall Rating */}
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary p-2.5">
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                          <div className="min-w-0">
                            <div className="tabular text-xs font-semibold text-foreground">
                              {hasRating ? (
                                <>
                                  {Number(member.avg_overall).toFixed(1)}
                                  <span className="text-3xs text-muted-foreground font-normal ml-1">
                                    ({member.rating_count})
                                  </span>
                                </>
                              ) : (
                                "New"
                              )}
                            </div>
                            <div className="text-3xs text-muted-foreground">
                              {hasRating ? "Overall rating" : "No reviews yet"}
                            </div>
                          </div>
                        </div>

                        {/* Metric 2: Reviews */}
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary p-2.5">
                          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <div className="tabular text-xs font-semibold text-foreground">
                              {member.rating_count && member.rating_count > 0 ? member.rating_count : "New"}
                            </div>
                            <div className="text-3xs text-muted-foreground">
                              {member.rating_count && member.rating_count > 0 ? "Student ratings" : "No reviews yet"}
                            </div>
                          </div>
                        </div>

                        {/* Metric 3: Anonymity Guarantee */}
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary p-2.5">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0">
                            <div className="tabular text-xs font-semibold text-foreground">Anonymous</div>
                            <div className="text-3xs text-muted-foreground">Reviewer names hidden</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Quick Department Shortcuts Bar */}
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Browse by department</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TOP_DEPARTMENTS.map((dept) => (
              <Link
                key={dept.short}
                to={`/faculty?dept=${encodeURIComponent(dept.name)}`}
                className="flex h-8 items-center justify-center truncate rounded-md border border-border px-2 text-center text-xs font-medium text-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
              >
                <span className="truncate">{dept.short}</span>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Widget 4: Active Campus Groups ── */}
      {groups.length > 0 && (
        <Card className="p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md border border-border bg-secondary p-1.5 text-muted-foreground">
                <GroupsIcon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Campus groups</h3>
            </div>
            <Link
              to="/workspace-groups"
              className="inline-flex min-h-[32px] items-center gap-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              All groups
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/workspace-groups/${group.id}`}
                className="group flex min-w-0 items-center justify-between rounded-lg border border-border p-2.5 transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="truncate text-sm font-medium text-foreground">
                    {group.name}
                  </h4>
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">
                    {group.member_count} {group.member_count === 1 ? "member" : "members"}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-3xs font-normal">
                  {group.visibility === "private" ? "Private" : "Public"}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
