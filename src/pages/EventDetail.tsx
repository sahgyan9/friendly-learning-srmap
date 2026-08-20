import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Share2,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Check,
  Copy,
  Users,
  CalendarPlus,
  Loader2,
  GraduationCap,
  ChevronRight,
  ZoomIn,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSRMAPEvent, useSRMAPEvents } from "@/hooks/useSRMAPEvents";
import { SRMAPEventCard } from "@/components/marketplace/SRMAPEventCard";
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadIcsFile,
} from "@/lib/calendar-utils";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl as optimizedImageUrl } from "@/lib/image/imageUrl";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { event, loading, error } = useSRMAPEvent(id);
  const { events: allEvents } = useSRMAPEvents();

  const [copied, setCopied] = useState(false);
  const [speakerImageFailed, setSpeakerImageFailed] = useState(false);
  const [posterImageFailed, setPosterImageFailed] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);

  // Extract poster image and clean description HTML
  const { posterUrl, cleanedHtml } = useMemo(() => {
    if (!event?.content) {
      return { posterUrl: null, cleanedHtml: "" };
    }
    const imgMatch = event.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    let extractedPoster: string | null = null;
    let html = event.content;
    if (imgMatch) {
      extractedPoster = imgMatch[1];
      html = html.replace(imgMatch[0], "").trim();
    }
    return { posterUrl: extractedPoster, cleanedHtml: html };
  }, [event?.content]);

  // Determine if speaker photo is different from poster
  const hasDistinctSpeakerImage = Boolean(
    event?.imageUrl && posterUrl && event.imageUrl !== posterUrl,
  );

  // Active poster to zoom (either content poster or featured image)
  const activePosterUrl = posterUrl || event?.imageUrl || null;

  // Time & Status computations
  const { isLive, hasEnded, isUpcoming, formattedDate, formattedTime, timeRemaining } =
    useMemo(() => {
      if (!event) {
        return {
          isLive: false,
          hasEnded: false,
          isUpcoming: false,
          formattedDate: "",
          formattedTime: "",
          timeRemaining: "",
        };
      }

      const parseDate = (val: string) => new Date(val.replace(" ", "T") + "+05:30");
      const start = parseDate(event.startDate);
      const end = parseDate(event.endDate);
      const now = new Date();

      const live = now >= start && now <= end;
      const ended = now > end;
      const upcoming = now < start;

      const fStart = start.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const fEnd = end.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
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

      const timeStr = `${tStart} – ${tEnd} (IST)`;

      let remaining = "";
      if (upcoming) {
        const diffMs = start.getTime() - now.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        if (days > 0) {
          remaining = `Starts in ${days} day${days > 1 ? "s" : ""}`;
        } else if (hours > 0) {
          remaining = `Starts in ${hours} hour${hours > 1 ? "s" : ""}`;
        } else {
          remaining = "Starting soon";
        }
      }

      return {
        isLive: live,
        hasEnded: ended,
        isUpcoming: upcoming,
        formattedDate: dateStr,
        formattedTime: timeStr,
        timeRemaining: remaining,
      };
    }, [event]);

  // Related events (excluding current)
  const relatedEvents = useMemo(() => {
    if (!event || !allEvents) return [];
    return allEvents
      .filter((e) => e.id !== event.id)
      .slice(0, 3);
  }, [event, allEvents]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Event link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!event) return;
    const text = encodeURIComponent(
      `Check out this campus event at SRMAP: "${event.title}"\n${window.location.href}`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-sm text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background pt-24">
        <div className="container mx-auto px-4 py-12 text-center max-w-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Event Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The event you are looking for may have concluded or is no longer listed on the campus calendar.
          </p>
          <Link to="/events">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to University Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const speakerImageSrc = event.imageUrl
    ? speakerImageFailed
      ? event.imageUrl
      : optimizedImageUrl(event.imageUrl, "800")
    : null;

  const posterImageSrc = activePosterUrl
    ? posterImageFailed
      ? activePosterUrl
      : optimizedImageUrl(activePosterUrl, "1280")
    : null;

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.excerpt || event.title,
    startDate: new Date(event.startDate.replace(" ", "T") + "+05:30").toISOString(),
    endDate: new Date(event.endDate.replace(" ", "T") + "+05:30").toISOString(),
    eventStatus: hasEnded
      ? "https://schema.org/EventMovedOnline"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: (event.venue || "").toLowerCase().includes("online")
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: (event.venue || "").toLowerCase().includes("online")
      ? {
          "@type": "VirtualLocation",
          url: event.link,
        }
      : {
          "@type": "Place",
          name: event.venue || "SRM University-AP Campus",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Amaravati",
            addressRegion: "Andhra Pradesh",
            addressCountry: "IN",
          },
        },
    image: activePosterUrl ? [activePosterUrl] : undefined,
    organizer: {
      "@type": "Organization",
      name: event.organizer || event.department || "SRM University-AP",
      url: `${PRIMARY_DOMAIN}/events`,
    },
  };

  // Reusable Event Information card component
  const EventInformationCard = () => (
    <Card className="border-border/60 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Event Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {/* Schedule info */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Date & Timing
            </p>
            <p className="text-sm font-medium text-foreground">{formattedDate}</p>
            <p className="text-xs text-muted-foreground">{formattedTime}</p>
          </div>
        </div>

        {/* Venue info */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Location / Venue
            </p>
            <p className="text-sm font-medium text-foreground">
              {event.venue || "SRM University-AP Campus"}
            </p>
          </div>
        </div>

        {/* Organizer info */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Organized By
            </p>
            <p className="text-sm font-medium text-foreground">
              {event.organizer || event.department || "SRM University-AP"}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 space-y-2.5">
          {/* Registration CTA Button */}
          {event.registrationUrl ? (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-medium text-sm h-10"
                disabled={hasEnded}
              >
                <Sparkles className="h-4 w-4" />
                {hasEnded ? "Registration Closed" : "Register"}
                <ExternalLink className="h-3.5 w-3.5 ml-0.5 opacity-80" />
              </Button>
            </a>
          ) : (
            <Button
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-medium text-sm h-10"
              onClick={() => {
                const calEvent = {
                  title: event.title,
                  description: event.excerpt || event.title,
                  location: event.venue || "SRM University-AP",
                  startDate: event.startDate,
                  endDate: event.endDate,
                };
                window.open(getGoogleCalendarUrl(calEvent), "_blank");
              }}
            >
              <CalendarPlus className="h-4 w-4" />
              Add to Calendar (Open Event)
            </Button>
          )}

          {/* Add to Calendar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full gap-2 text-xs">
                <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
                Export to Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  const calEvent = {
                    title: event.title,
                    description: event.excerpt || event.title,
                    location: event.venue || "SRM University-AP",
                    startDate: event.startDate,
                    endDate: event.endDate,
                  };
                  window.open(getGoogleCalendarUrl(calEvent), "_blank");
                }}
              >
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const calEvent = {
                    title: event.title,
                    description: event.excerpt || event.title,
                    location: event.venue || "SRM University-AP",
                    startDate: event.startDate,
                    endDate: event.endDate,
                  };
                  window.open(getOutlookCalendarUrl(calEvent), "_blank");
                }}
              >
                Outlook Calendar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const calEvent = {
                    title: event.title,
                    description: event.excerpt || event.title,
                    location: event.venue || "SRM University-AP",
                    startDate: event.startDate,
                    endDate: event.endDate,
                  };
                  downloadIcsFile(calEvent);
                }}
              >
                Download .ICS File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={handleCopyLink}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleShareWhatsApp}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>

          {/* Official source link */}
          <div className="pt-2 text-center">
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
            >
              Official university notice
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <SEOHead
        title={`${event.title} | University Events | Friendly Learning SRMAP`}
        description={
          event.excerpt ||
          `Official university event details, schedule, venue, and registration for ${event.title} at SRM University-AP.`
        }
        canonical={`${PRIMARY_DOMAIN}/events/${event.id}`}
      />

      <StructuredData data={eventSchema} />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "University Events", url: `${PRIMARY_DOMAIN}/events` },
          { name: event.title, url: `${PRIMARY_DOMAIN}/events/${event.id}` },
        ])}
      />

      <div className="min-h-screen bg-background pb-16">
        {/* Navigation Breadcrumb Bar */}
        <div className="border-b border-border/60 bg-muted/20 pt-20">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              <Link to="/events" className="hover:text-foreground transition-colors">
                University Events
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              <span className="text-foreground font-medium truncate max-w-xs sm:max-w-md">
                {event.title}
              </span>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="container mx-auto px-4 pt-6 pb-8 space-y-8">
          {/* Back link */}
          <div>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to University Events
            </Link>
          </div>

          {/* Elevated Raised Hero Card (Matches Mentor/Faculty Profile Rectangle Design) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-md"
          >
            {/* Ambient Ambient Glow Accents */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-violet-500/10 via-background to-transparent blur-3xl" />

            <div className="relative space-y-6">
              {/* Top Row: Badges & Direct Register CTA Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Status / Category Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {isLive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                      Live Now
                    </span>
                  )}
                  {isUpcoming && timeRemaining && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
                      <Clock className="h-3.5 w-3.5" />
                      {timeRemaining}
                    </span>
                  )}
                  {hasEnded && (
                    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      Event Concluded
                    </span>
                  )}

                  {event.department && (
                    <Badge
                      variant="outline"
                      className="border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 text-xs"
                    >
                      {event.department}
                    </Badge>
                  )}

                  {event.eventType && (
                    <Badge variant="secondary" className="text-xs">
                      {event.eventType}
                    </Badge>
                  )}
                </div>

                {/* Direct Register Action on Hero for desktop */}
                {event.registrationUrl && !hasEnded && (
                  <div className="hidden sm:block">
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="sm"
                        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-medium px-5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Register
                        <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              {/* Main Content Row: Speaker Avatar / Image + Event Heading */}
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Speaker Photo / Featured Avatar */}
                {hasDistinctSpeakerImage && speakerImageSrc && (
                  <div className="relative shrink-0 mx-auto sm:mx-0">
                    <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-border bg-muted/60 shadow-inner flex items-center justify-center">
                      <img
                        src={speakerImageSrc}
                        alt="Event Speaker / Featured"
                        className="h-full w-full object-cover object-top"
                        onError={() => setSpeakerImageFailed(true)}
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-background bg-card p-1.5 shadow-xs">
                      <GraduationCap className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                )}

                {/* Details & Title */}
                <div className="flex-1 space-y-2 text-left">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {event.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground/90">
                      <Building2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      {event.organizer || event.department || "SRM University-AP"}
                    </span>
                    {event.venue && (
                      <>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-violet-500/70" />
                          {event.venue}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Raised Quick Stats & Timing Strip (Matching Mentor / Faculty Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Date & Time
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">{formattedDate}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{formattedTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Location / Venue
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {event.venue || "SRM University-AP Campus"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 shadow-xs">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Organized By
                    </p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {event.organizer || event.department || "SRM University-AP"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content Layout: Left 2 Cols (Poster + About) & Right 1 Col (Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
            {/* Left 2 Cols on Desktop, Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* MOBILE ONLY: Event Information Card placed directly below header */}
              <div className="block lg:hidden">
                <EventInformationCard />
              </div>

              {/* Event Overview, Poster & Agenda */}
              <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border/40 bg-muted/10 pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    About This Event
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Official Event Poster / Flyer (With Zoom Lightbox) */}
                  {posterImageSrc && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                          Official Event Poster / Flyer
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Click poster to zoom
                        </span>
                      </div>

                      <Dialog open={isPosterOpen} onOpenChange={setIsPosterOpen}>
                        <DialogTrigger asChild>
                          <div
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-muted/20 w-full shadow-sm flex items-center justify-center max-h-[460px] transition-all hover:border-violet-500/50 hover:shadow-md"
                          >
                            <div
                              className="absolute inset-0 bg-cover bg-center blur-xl opacity-20 dark:opacity-30 scale-105"
                              style={{ backgroundImage: `url(${posterImageSrc})` }}
                            />
                            <img
                              src={posterImageSrc}
                              alt={event.title}
                              className="relative z-10 max-h-[460px] w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
                              onError={() => setPosterImageFailed(true)}
                            />

                            {/* Subtle hover zoom icon */}
                            <div className="absolute bottom-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur border border-border/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <ZoomIn className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                          </div>
                        </DialogTrigger>

                        <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur border-border/80 sm:rounded-2xl overflow-hidden">
                          <div className="relative flex flex-col items-center justify-center p-2">
                            <div className="w-full flex items-center justify-between px-2 pb-2 border-b border-border/60">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                <span className="text-xs font-semibold truncate max-w-xs sm:max-w-md">
                                  {event.title}
                                </span>
                              </div>
                              <a
                                href={activePosterUrl || posterImageSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline mr-6"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Open original</span>
                              </a>
                            </div>

                            <div className="relative mt-3 max-h-[80vh] w-full flex items-center justify-center overflow-auto">
                              <img
                                src={activePosterUrl || posterImageSrc}
                                alt={event.title}
                                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-sm"
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {/* Description Text & Key Details */}
                  {cleanedHtml ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-ul:my-2 prose-li:my-0.5"
                      dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {event.excerpt || "No additional description provided for this session."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Teammate / Buddy Finder Callout */}
              <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-transparent shadow-sm">
                <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold">Attending this event?</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connect with other SRM University-AP students, find project partners, or study groups.
                    </p>
                  </div>
                  <Link to="/study-partners" className="shrink-0">
                    <Button size="sm" variant="outline" className="text-xs border-violet-500/30 hover:bg-violet-500/10">
                      Find Study Buddies
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* DESKTOP ONLY: Sticky Right Column Sidebar */}
            <div className="hidden lg:block space-y-6">
              <div className="sticky top-24">
                <EventInformationCard />
              </div>
            </div>
          </div>

          {/* Related / Upcoming Events Section */}
          {relatedEvents.length > 0 && (
            <div className="mt-16 pt-12 border-t border-border/60">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">More Campus Events</h3>
                  <p className="text-xs text-muted-foreground">
                    Explore upcoming seminars, bootcamps, and workshops
                  </p>
                </div>
                <Link to="/events">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-violet-600 dark:text-violet-400">
                    View all events
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedEvents.map((e) => (
                  <SRMAPEventCard key={e.id} event={e} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EventDetail;
