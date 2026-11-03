import { useState, useMemo, useEffect } from "react";
import NoIndex from "@/components/NoIndex";
import { useParams, Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Share2,
  ArrowLeft,
  ExternalLink,
  Check,
  Copy,
  Users,
  CalendarPlus,
  CalendarX,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EventShareModal } from "@/components/events/EventShareModal";
import { EventAttendeeRoster } from "@/components/events/EventAttendeeRoster";
import { EventStatus } from "@/components/marketplace/EventStatus";
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadIcsFile,
  parseEventDate,
} from "@/lib/calendar-utils";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { toast } from "sonner";
import { getOptimizedImageUrl as optimizedImageUrl } from "@/lib/image/imageUrl";

import { checkMyUpcomingEventReminders } from "@/integrations/supabase/services/event-attendees";

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { event, loading, error } = useSRMAPEvent(id);
  const { events: allEvents } = useSRMAPEvents();

  const [copied, setCopied] = useState(false);
  const [speakerImageFailed, setSpeakerImageFailed] = useState(false);
  const [posterImageFailed, setPosterImageFailed] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    checkMyUpcomingEventReminders().catch(() => {});
  }, []);

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

      const start = parseEventDate(event.startDate);
      const end = parseEventDate(event.endDate);
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
    toast.success("Link copied");
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
      <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading event">
        <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="flex flex-col gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="h-96 animate-pulse rounded-lg bg-muted lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <NoIndex />
        <div className="container mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <CalendarX className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Event not found</h1>
            <p className="text-sm text-muted-foreground">
              This event may have ended or been removed from the university calendar.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/events">
              <ArrowLeft className="h-4 w-4" />
              All events
            </Link>
          </Button>
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
    startDate: parseEventDate(event.startDate).toISOString(),
    endDate: parseEventDate(event.endDate).toISOString(),
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

  const calEvent = {
    title: event.title,
    description: event.excerpt || event.title,
    location: event.venue || "SRM University-AP",
    startDate: event.startDate,
    endDate: event.endDate,
  };
  const organizerName = event.organizer || event.department || "SRM University-AP";
  const registrationOpen = Boolean(event.registrationUrl) && !hasEnded;

  const detailRow = (Icon: typeof Calendar, label: string, value: string, sub?: string) => (
    <div className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-sm font-medium text-foreground">{value}</dd>
        {sub && <dd className="tabular text-sm text-muted-foreground">{sub}</dd>}
      </div>
    </div>
  );

  // Rendered twice (mobile: above the description, desktop: sticky sidebar),
  // so it is a render function rather than a component to keep state shared.
  const eventInformationCard = () => (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-0">
        <dl className="flex flex-col gap-4">
          {detailRow(Calendar, "Date and time", formattedDate, formattedTime)}
          {detailRow(MapPin, "Venue", event.venue || "SRM University-AP Campus")}
          {detailRow(Building2, "Organised by", organizerName)}
        </dl>

        <div className="flex flex-col gap-2 border-t pt-5">
          {event.registrationUrl ? (
            hasEnded ? (
              <Button className="w-full" disabled>
                Registration closed
              </Button>
            ) : (
              <Button className="w-full" asChild>
                <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
                  Register
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={event.registrationUrl ? "outline" : "default"} className="w-full">
                <CalendarPlus className="h-4 w-4" />
                Add to calendar
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(calEvent), "_blank")}>
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(getOutlookCalendarUrl(calEvent), "_blank")}>
                Outlook Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadIcsFile(calEvent)}>
                Download .ics file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsShareModalOpen(true)}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleCopyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>

        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Official university notice
          <ExternalLink className="h-3 w-3" />
        </a>
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
        <div className="container mx-auto flex flex-col gap-8 px-4 pt-6">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/events" className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              University Events
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            <span className="truncate text-foreground">{event.title}</span>
          </nav>

          <header className="flex animate-fade-up flex-col gap-5 border-b pb-8 sm:flex-row sm:items-start">
            {hasDistinctSpeakerImage && speakerImageSrc && (
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted sm:h-28 sm:w-28">
                <img
                  src={speakerImageSrc}
                  alt="Speaker"
                  className="h-full w-full object-cover object-top"
                  onError={() => setSpeakerImageFailed(true)}
                />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {isLive && <EventStatus tone="live">Live now</EventStatus>}
                {isUpcoming && timeRemaining && <EventStatus tone="neutral">{timeRemaining}</EventStatus>}
                {hasEnded && <EventStatus tone="ended">Ended</EventStatus>}
                {registrationOpen && !isLive && <EventStatus tone="open">Registration open</EventStatus>}
                {(event.department || event.eventType) && (
                  <span className="text-xs text-muted-foreground">
                    {[event.department, event.eventType].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
                {event.title}
              </h1>

              <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Date</dt>
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  <dd className="tabular">{formattedDate}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Time</dt>
                  <Clock className="h-4 w-4 shrink-0" aria-hidden />
                  <dd className="tabular">{formattedTime}</dd>
                </div>
                {event.venue && (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <dt className="sr-only">Venue</dt>
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <dd className="min-w-0 truncate">{event.venue}</dd>
                  </div>
                )}
              </dl>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
              <div className="lg:hidden">{eventInformationCard()}</div>

              <section aria-labelledby="about-event" className="flex flex-col gap-5">
                <h2 id="about-event" className="text-lg font-semibold tracking-tight">About this event</h2>

                {posterImageSrc && (
                  <Dialog open={isPosterOpen} onOpenChange={setIsPosterOpen}>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="View poster full size"
                        className="group relative flex max-h-[460px] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted transition-colors duration-150 hover:border-foreground/20"
                      >
                        <img
                          src={posterImageSrc}
                          alt={`Poster for ${event.title}`}
                          className="max-h-[460px] w-full object-contain"
                          onError={() => setPosterImageFailed(true)}
                        />
                        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground shadow-card">
                          <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                          View full size
                        </span>
                      </button>
                    </DialogTrigger>

                    <DialogContent className="max-w-4xl overflow-hidden p-2">
                      <div className="flex flex-col gap-3 p-2">
                        <div className="flex items-center justify-between gap-4 border-b pb-2 pr-8">
                          <span className="truncate text-sm font-medium">{event.title}</span>
                          <a
                            href={activePosterUrl || posterImageSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Download className="h-4 w-4" />
                            Open original
                          </a>
                        </div>
                        <div className="flex max-h-[80vh] w-full items-center justify-center overflow-auto">
                          <img
                            src={activePosterUrl || posterImageSrc}
                            alt={`Poster for ${event.title}`}
                            className="max-h-[75vh] w-auto rounded-md object-contain"
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {cleanedHtml ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-a:text-primary prose-ul:my-2 prose-li:my-0.5"
                    dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {event.excerpt || "The organisers have not published a description for this event."}
                  </p>
                )}
              </section>

              <EventAttendeeRoster event={event} />

              <div className="flex flex-col items-start justify-between gap-4 rounded-lg border p-5 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold">Share with your groups</h2>
                  <p className="text-sm text-muted-foreground">
                    Post this event to a community group or send it on WhatsApp.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => setIsShareModalOpen(true)}>
                    <Users className="h-4 w-4" />
                    Share to group
                  </Button>
                  <Button variant="ghost" onClick={handleShareWhatsApp}>
                    <Share2 className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-24">{eventInformationCard()}</div>
            </aside>
          </div>

          {relatedEvents.length > 0 && (
            <section aria-labelledby="more-events" className="mt-8 flex flex-col gap-6 border-t pt-10">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="more-events" className="text-xl font-semibold tracking-tight">More campus events</h2>
                  <p className="text-sm text-muted-foreground">Other seminars, workshops and talks on the calendar.</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/events">
                    All events
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {relatedEvents.map((e) => (
                  <SRMAPEventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <EventShareModal
        event={event}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </>
  );
};

export default EventDetail;
