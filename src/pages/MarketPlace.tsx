import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Settings2, AlertCircle, CalendarX, ExternalLink, type LucideIcon } from "lucide-react";
import { SRMAPEventCard } from "@/components/marketplace/SRMAPEventCard";
import { YourEventsStrip } from "@/components/marketplace/YourEventsStrip";
import { useSRMAPEvents, type SRMAPEvent } from "@/hooks/useSRMAPEvents";
import { useEventRSVPs } from "@/hooks/useEventRSVPs";
import { Button } from "@/components/ui/button";
import { isUserAdmin, syncSRMAPEvents } from '@/integrations/supabase/services/marketplace';
import { checkMyUpcomingEventReminders } from '@/integrations/supabase/services/event-attendees';
import { useAuth } from '@/context/AuthContext';
import { useHasVisitedEventsNav } from "@/hooks/useFeatureAnnouncement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { parseEventDate } from "@/lib/calendar-utils";

type EventTab = "all" | "mine" | "past";

function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex max-w-md flex-col gap-1">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {action}
        </div>
    );
}

const MarketPlace = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<EventTab>("all");
    const { user } = useAuth();
    const { events: srmapEvents, loading: srmapLoading, error: srmapError, refetch } = useSRMAPEvents();
    const { rsvps, pendingEventId, toggleRSVP } = useEventRSVPs();
    const { markSeen: markEventsNavSeen } = useHasVisitedEventsNav();

    // Reaching this page is what clears the welcome tour's navbar dot.
    useEffect(() => {
        markEventsNavSeen();
    }, [markEventsNavSeen]);

    useEffect(() => {
        if (user) {
            checkAdminStatus();
            checkMyUpcomingEventReminders().catch(() => {});
        }
    }, [user]);

    const checkAdminStatus = async () => {
        try {
            const adminStatus = await isUserAdmin();
            setIsAdmin(adminStatus);
        } catch (error) {
            console.error("Error checking admin status:", error);
        }
    };

    const handleSyncEvents = async () => {
        try {
            setIsSyncing(true);
            const res = await syncSRMAPEvents();
            toast.success('Events synced', {
                description: `${res.synced} events updated from the SRM AP feed.`,
            });
            refetch();
        } catch (error) {
            console.error('Error syncing events:', error);
            toast.error('Sync failed', {
                description: error instanceof Error ? error.message : 'Failed to sync events.',
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // srmapEvents already arrives sorted live -> upcoming (soonest first) ->
    // past (most recent first), so every list below preserves that order and
    // only partitions it.
    const { currentEvents, pastEvents, myEvents } = useMemo(() => {
        const now = Date.now();
        const current: SRMAPEvent[] = [];
        const past: SRMAPEvent[] = [];

        srmapEvents.forEach((event) => {
            if (parseEventDate(event.endDate).getTime() < now) {
                past.push(event);
            } else {
                current.push(event);
            }
        });

        return {
            // Events the student RSVP'd to float to the top of the main feed.
            currentEvents: [
                ...current.filter((e) => rsvps[e.id]),
                ...current.filter((e) => !rsvps[e.id]),
            ],
            pastEvents: past,
            myEvents: current.filter((e) => rsvps[e.id]),
        };
    }, [srmapEvents, rsvps]);

    const tabEvents =
        activeTab === "past" ? pastEvents : activeTab === "mine" ? myEvents : currentEvents;

    const query = searchQuery.trim().toLowerCase();
    const filteredEvents = query
        ? tabEvents.filter(e =>
            e.title.toLowerCase().includes(query) ||
            e.excerpt.toLowerCase().includes(query) ||
            e.department.toLowerCase().includes(query)
        )
        : tabEvents;

    const tabs: { id: EventTab; label: string; count: number }[] = [
        { id: "all", label: "Upcoming", count: currentEvents.length },
        ...(user ? [{ id: "mine" as const, label: "My RSVPs", count: myEvents.length }] : []),
        { id: "past", label: "Past", count: pastEvents.length },
    ];

    const emptyTitle =
        activeTab === "mine" ? "No RSVPs yet" : activeTab === "past" ? "No past events" : "No current events";
    const emptyMessage =
        activeTab === "mine"
            ? "Select Going or Interested on an event to pin it here and get reminders."
            : activeTab === "past"
                ? "Events move here after they end."
                : "There are no upcoming university events right now.";

    const showTabs = !srmapLoading && !srmapError && srmapEvents.length > 0;

    return (
        <>
            <SEOHead
                title={ROUTE_META["/events"].title}
                description={ROUTE_META["/events"].description}
                keywords="university events srmap, srm ap events, events in srmap, srm university ap events, campus events, workshops, hackathons, guest lectures, student activities"
                canonical={`${PRIMARY_DOMAIN}/events`}
            />

            <StructuredData data={getBreadcrumbSchema([
                { name: "Home", url: `${PRIMARY_DOMAIN}/` },
                { name: "University Events", url: `${PRIMARY_DOMAIN}/events` }
            ])} />

            <div className="min-h-screen bg-background">
                {/* The site header is sticky (in flow), so this block needs no
                    navbar offset; the pt-28 left over from the old fixed navbar
                    is what rendered an empty band above the heading. */}
                <div className="border-b">
                    <div className="container mx-auto flex flex-col gap-4 px-4 pb-6 pt-8 sm:flex-row sm:items-end sm:justify-between md:pt-10">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">University Events</h1>
                            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                                Official SRM AP events. RSVP to get reminders and keep them pinned here.
                            </p>
                        </div>
                        {isAdmin && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button variant="outline" onClick={handleSyncEvents} isLoading={isSyncing}>
                                    {!isSyncing && <RefreshCw className="h-4 w-4" />}
                                    {isSyncing ? "Syncing" : "Sync events"}
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link to="/admin">
                                        <Settings2 className="h-4 w-4" />
                                        Admin panel
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
                    {/* Pinned "Your Events" ribbon — only when the student has live
                        or upcoming RSVPs. */}
                    {!srmapLoading && myEvents.length > 0 && (
                        <YourEventsStrip events={myEvents} rsvps={rsvps} />
                    )}

                    <div className={cn(
                        "flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between",
                        showTabs && "border-b",
                    )}>
                        {/* Category tabs (Workshops, Hackathons...) are deliberately
                            absent: the upstream feed rarely carries enough of any one
                            category to fill one. */}
                        {showTabs ? (
                            <div className="-mb-px flex gap-6 overflow-x-auto" role="tablist" aria-label="Event filters">
                                {tabs.map(tab => {
                                    const selected = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 text-sm font-medium transition-colors duration-150",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                selected
                                                    ? "border-primary text-foreground"
                                                    : "border-transparent text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {tab.label}
                                            <span className={cn(
                                                "tabular rounded px-1.5 text-xs",
                                                selected ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                                            )}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : <span />}

                        <div className={cn("relative w-full sm:max-w-xs", showTabs && "sm:pb-2")}>
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground sm:top-[calc(50%-4px)]" aria-hidden />
                            <Input
                                type="search"
                                placeholder="Search events"
                                aria-label="Search events"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9"
                            />
                        </div>
                    </div>

                    {srmapLoading ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading events">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="overflow-hidden rounded-lg border bg-card shadow-card">
                                    <div className="aspect-video animate-pulse bg-muted" />
                                    <div className="flex flex-col gap-3 p-5">
                                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                        <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                                        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                                        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : srmapError ? (
                        <EmptyState
                            icon={AlertCircle}
                            title="Events could not be loaded"
                            description={srmapError}
                            action={
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Button onClick={() => refetch()}>Retry</Button>
                                    <Button variant="outline" asChild>
                                        <a href="https://events.srmap.edu.in/" target="_blank" rel="noopener noreferrer">
                                            Open SRM AP events site
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                </div>
                            }
                        />
                    ) : srmapEvents.length === 0 ? (
                        <EmptyState
                            icon={CalendarX}
                            title="No events published"
                            description="The university has not listed any current events. Check back later."
                        />
                    ) : filteredEvents.length === 0 ? (
                        <EmptyState
                            icon={query ? Search : CalendarX}
                            title={query ? "No events match your search" : emptyTitle}
                            description={query ? "Try a shorter term or a department name." : emptyMessage}
                            action={query ? (
                                <Button variant="outline" onClick={() => setSearchQuery("")}>Clear search</Button>
                            ) : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredEvents.map((event, i) => (
                                <div
                                    key={event.id}
                                    className="flex min-w-0 animate-fade-up [&>*]:flex-1"
                                    style={i < 6 ? { animationDelay: `${i * 35}ms`, animationFillMode: "both" } : undefined}
                                >
                                    <SRMAPEventCard
                                        event={event}
                                        rsvpStatus={rsvps[event.id] ?? null}
                                        onRsvp={(id, status) => toggleRSVP(id, status, {
                                            title: event.title,
                                            startDate: event.startDate,
                                            venue: event.venue,
                                        })}
                                        rsvpPending={pendingEventId === event.id}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default MarketPlace;
