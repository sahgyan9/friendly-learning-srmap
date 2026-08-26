import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  GraduationCap,
  Users,
  Building2,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  BadgeCheck,
  ChevronRight,
  CheckCircle2,
  MessageCircle,
  Star,
  Zap,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { useAuth } from "@/context/AuthContext";
import { useSRMAPEvents, type SRMAPEvent } from "@/hooks/useSRMAPEvents";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { listCommunities, type Community } from "@/integrations/supabase/services/communities";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { sampleMentors } from "@/data/mentors";
import type { Mentor } from "@/types/mentor";

function parseEventDate(value: string | undefined): { month: string; day: string; time: string; isLive: boolean } {
  if (!value) return { month: "UPC", day: "--", time: "", isLive: false };
  try {
    const d = new Date(value.replace(" ", "T") + "+05:30");
    if (isNaN(d.getTime())) return { month: "UPC", day: "--", time: "", isLive: false };
    
    const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const day = d.toLocaleDateString("en-US", { day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    
    const now = new Date();
    const isLive = d.toDateString() === now.toDateString();

    return { month, day, time, isLive };
  } catch {
    return { month: "UPC", day: "--", time: "", isLive: false };
  }
}

const TOP_DEPARTMENTS = [
  { name: "Computer Science", short: "CSE", color: "hover:border-blue-500/50 hover:bg-blue-500/5 text-blue-600 dark:text-blue-400" },
  { name: "Electronics", short: "ECE", color: "hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
  { name: "Mechanical", short: "ME", color: "hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400" },
  { name: "Management", short: "Paari", color: "hover:border-purple-500/50 hover:bg-purple-500/5 text-purple-600 dark:text-purple-400" },
];

export const CampusSidebarWidgets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const { events, loading: eventsLoading } = useSRMAPEvents();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [groups, setGroups] = useState<Community[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);

  const handleConnect = async (mentor: Mentor, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please sign in to message mentors");
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
        toast.error("Failed to start conversation with mentor");
        navigate(`/mentor/${mentor.slug || mentor.id}`);
        return;
      }
      toast.success(`Connected with ${mentor.name}!`);
      navigate(`/messages?chat=${conversation.id}`);
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
      {/* ── Widget 1: Upcoming Events (Mini Calendar View) ── */}
      <Card className="p-4 border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Upcoming Events</h3>
          </div>
          <Link
            to="/events"
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5 group"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {eventsLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-2.5">
            {events.slice(0, 3).map((event) => {
              const { month, day, time, isLive } = parseEventDate(event.startDate);
              return (
                <Tooltip key={event.id}>
                  <TooltipTrigger asChild>
                    <Link
                      to={`/events/${event.id}`}
                      className="group flex items-start gap-3 p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-primary/30 transition-all duration-200"
                    >
                      {/* Calendar Date Badge */}
                      <div
                        className={`flex flex-col items-center justify-center shrink-0 w-11 h-12 rounded-lg border text-center leading-none mt-0.5 ${
                          isLive
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-600"
                            : "bg-background border-border/80 text-foreground"
                        }`}
                      >
                        <span className="text-4xs font-bold tracking-wider text-muted-foreground uppercase">{month}</span>
                        <span className="text-base font-extrabold mt-0.5">{day}</span>
                      </div>

                      {/* Event Details */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {event.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted-foreground mt-1">
                          {time && time !== "12:00 AM" && (
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3 text-muted-foreground/70" />
                              {time}
                            </span>
                          )}
                          {event.venue && (
                            <span className="truncate inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                              {event.venue}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    sideOffset={12}
                    className="max-w-sm rounded-2xl p-4 bg-white dark:bg-card text-foreground border border-border shadow-2xl ring-1 ring-black/10 dark:ring-white/10 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-3xs font-semibold px-2.5 py-0.5 rounded-full">
                          Campus Event
                        </Badge>
                        {event.department && (
                          <Badge variant="secondary" className="text-3xs font-medium px-2 py-0.5 rounded-full">
                            {event.department.split(" ")[0]}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-foreground leading-snug tracking-tight">
                        {event.title}
                      </h3>

                      <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-rose-500/10 text-rose-600 text-2xs shrink-0 font-semibold">
                            📅
                          </span>
                          <span className="font-medium text-foreground">{month} {day}</span>
                          {time && time !== "12:00 AM" && (
                            <span className="text-muted-foreground font-normal">• {time}</span>
                          )}
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-blue-500/10 text-blue-600 text-2xs shrink-0 font-semibold">
                              📍
                            </span>
                            <span className="text-muted-foreground font-normal line-clamp-1">{event.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">No upcoming events listed right now.</p>
        )}
      </Card>

      {/* ── Widget 2: Featured Senior Mentors ── */}
      <Card className="p-4 border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Featured Mentors</h3>
          </div>
          <Link
            to="/mentors"
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5 group"
          >
            All mentors
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {mentorsLoading ? (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
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
                    <div className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer">
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
                            className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate flex items-center gap-1"
                          >
                            <span className="truncate">{mentor.name}</span>
                            <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          </Link>
                          <p className="text-2xs text-muted-foreground truncate">
                            {mentor.department || "Senior Mentor"}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isConnecting}
                        onClick={(e) => handleConnect(mentor, e)}
                        className="h-7 text-xs px-2.5 shrink-0 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                      >
                        {isConnecting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    sideOffset={14}
                    className="w-[460px] max-w-[90vw] rounded-2xl p-5 bg-white dark:bg-card text-foreground border border-border shadow-2xl ring-1 ring-black/10 dark:ring-white/10 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
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
                            className="h-16 w-16 rounded-2xl shadow-xs ring-2 ring-primary/20 object-cover"
                            fallbackClassName="rounded-2xl text-xl font-bold"
                          />
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 shadow-2xs whitespace-nowrap">
                            <BadgeCheck className="h-3 w-3 text-blue-500" />
                            <span className="text-3xs font-semibold text-blue-600 dark:text-blue-400">
                              Verified
                            </span>
                          </div>
                        </div>

                        {/* Middle: Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="font-extrabold text-base text-foreground tracking-tight truncate">
                                {mentor.name}
                              </h4>
                              <CheckCircle2 className="h-4 w-4 text-blue-600 fill-blue-600/10 shrink-0" />
                            </div>
                            <Button
                              size="sm"
                              disabled={isConnecting}
                              onClick={(e) => handleConnect(mentor, e)}
                              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 h-7.5 gap-1.5 rounded-lg shadow-sm"
                            >
                              {isConnecting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageCircle className="h-3.5 w-3.5" />
                              )}
                              Connect with Mentor
                            </Button>
                          </div>

                          <p className="text-xs font-medium text-muted-foreground mt-1">
                            <span className="text-foreground/90 font-semibold">
                              {(mentor.department || "Senior Mentor")
                                .replace(/\[.*?\]/g, "")
                                .replace(/\(.*?\)/g, "")
                                .trim()}{" "}
                              Mentor
                            </span>
                            {" • "}
                            <span className="text-primary font-medium">{mentor.university || "SRM University AP"}</span>
                          </p>

                          {(mentor.tagline || mentor.bio) && (
                            <p className="text-xs text-foreground/80 font-medium leading-relaxed italic pt-1.5 line-clamp-2">
                              &ldquo;{mentor.tagline || mentor.bio}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom: Trust Metrics Grid Bar */}
                      <div className="pt-3 border-t border-border/60 grid grid-cols-3 gap-2.5">
                        {/* Metric 1: Rating */}
                        <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-2.5 shadow-2xs">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <Star className="h-4 w-4 fill-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground">
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
                            <div className="text-3xs text-muted-foreground font-medium">
                              {hasRating ? "Rating Score" : "No reviews yet"}
                            </div>
                          </div>
                        </div>

                        {/* Metric 2: Reviews */}
                        <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-2.5 shadow-2xs">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground">
                              {mentor.review_count && mentor.review_count > 0 ? mentor.review_count : "New"}
                            </div>
                            <div className="text-3xs text-muted-foreground font-medium">
                              {mentor.review_count && mentor.review_count > 0 ? "Peer Reviews" : "No reviews yet"}
                            </div>
                          </div>
                        </div>

                        {/* Metric 3: Response Rate */}
                        <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-2.5 shadow-2xs">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground">Active</div>
                            <div className="text-3xs text-muted-foreground font-medium">Direct Messaging</div>
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
      <Card className="p-4 border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-600">
              <Building2 className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Faculty Explorer</h3>
          </div>
          <Link
            to="/faculty"
            className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5 group"
          >
            Explore all
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Explore research specializations & anonymous reviews by department:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TOP_DEPARTMENTS.map((dept) => (
            <Link
              key={dept.short}
              to={`/faculty?dept=${encodeURIComponent(dept.name)}`}
              className={`flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 text-xs font-medium transition-all ${dept.color}`}
            >
              <span>{dept.short}</span>
              <ArrowRight className="h-3 w-3 opacity-60" />
            </Link>
          ))}
        </div>
      </Card>

      {/* ── Widget 4: Active Campus Groups ── */}
      {groups.length > 0 && (
        <Card className="p-4 border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Campus Groups</h3>
            </div>
            <Link
              to="/workspace-groups"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-0.5 group"
            >
              All groups
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/workspace-groups/${group.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all group"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {group.name}
                  </h4>
                  <p className="text-2xs text-muted-foreground mt-0.5">
                    {group.member_count} {group.member_count === 1 ? "member" : "members"}
                  </p>
                </div>
                <Badge variant="outline" className="text-3xs shrink-0 font-normal border-border/80">
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
