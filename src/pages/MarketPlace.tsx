import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { SRMAPEventCard } from "@/components/marketplace/SRMAPEventCard";
import { YourEventsStrip } from "@/components/marketplace/YourEventsStrip";
import { useSRMAPEvents, type SRMAPEvent } from "@/hooks/useSRMAPEvents";
import { useEventRSVPs } from "@/hooks/useEventRSVPs";
import { Button } from "@/components/ui/button";
import { isUserAdmin, syncSRMAPEvents } from '@/integrations/supabase/services/marketplace';
import { useAuth } from '@/context/AuthContext';
import { useHasVisitedEventsNav } from "@/hooks/useFeatureAnnouncement";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";

type EventTab = "all" | "mine" | "past";

function parseEventDate(value: string) {
    return new Date(value.replace(" ", "T") + "+05:30").getTime();
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
            toast.success('SRMAP Events Synced', {
                description: `Successfully synced ${res.synced} events.`,
            });
            refetch();
        } catch (error) {
            console.error('Error syncing events:', error);
            toast.error('Sync Failed', {
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
            if (parseEventDate(event.endDate) < now) {
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
        { id: "all", label: "All Events", count: currentEvents.length },
        ...(user ? [{ id: "mine" as const, label: "My RSVPs", count: myEvents.length }] : []),
        { id: "past", label: "Past", count: pastEvents.length },
    ];

    const emptyMessage =
        activeTab === "mine"
            ? "You haven't RSVP'd to anything yet. Hit Going or Interested on an event to pin it here."
            : activeTab === "past"
                ? "No past events in the archive yet."
                : "No current university events found";

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
                {/* Hero header */}
                <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-violet-500/5 via-background to-background">
                  {/* Decorative blobs */}
                  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-violet-500/5 blur-2xl" />

                  <div className="container mx-auto px-4 pb-8 pt-28">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">University Events</h1>
                          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                            Official SRMAP events — stay updated with everything happening on campus.
                          </p>
                        </div>

                        {/* Live badge */}
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="h-3 w-3" />
                          Live
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex-1 w-full sm:w-auto">
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="Search events..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 w-full"
                                    />
                                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={handleSyncEvents}
                                        disabled={isSyncing}
                                        className="w-full sm:w-auto"
                                    >
                                        <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                                        {isSyncing ? "Syncing..." : "Sync Events"}
                                    </Button>
                                    <Link to="/admin" className="w-full sm:w-auto">
                                        <Button variant="outline" className="w-full sm:w-auto">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Admin Panel
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Pinned "Your Events" ribbon — only when the student has live
                            or upcoming RSVPs. */}
                        {!srmapLoading && myEvents.length > 0 && (
                            <YourEventsStrip events={myEvents} rsvps={rsvps} />
                        )}

                        {/* Tabs. Category tabs (Workshops, Hackathons...) are
                            deliberately absent: the upstream feed rarely carries
                            enough of any one category to fill one. */}
                        {!srmapLoading && !srmapError && srmapEvents.length > 0 && (
                            <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Event filters">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeTab === tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            activeTab === tab.id
                                                ? "border-violet-500/40 bg-violet-500/12 text-violet-700 dark:text-violet-300"
                                                : "border-border/60 text-muted-foreground hover:border-violet-500/30 hover:bg-violet-500/8",
                                        )}
                                    >
                                        {tab.label}
                                        <span className={cn(
                                            "rounded-full px-1.5 py-0.5 text-2xs font-semibold",
                                            activeTab === tab.id ? "bg-violet-500/20" : "bg-muted",
                                        )}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {srmapLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : srmapError ? (
                            <div className="text-center py-12">
                                <p className="text-lg text-muted-foreground">{srmapError}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    <a href="https://events.srmap.edu.in/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                        Visit SRMAP Events directly
                                    </a>
                                </p>
                            </div>
                        ) : srmapEvents.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-lg text-muted-foreground">No current university events found</p>
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="mx-auto max-w-md text-lg text-muted-foreground">
                                    {query ? "No events match your search" : emptyMessage}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.map(event => (
                                    <SRMAPEventCard
                                        key={event.id}
                                        event={event}
                                        rsvpStatus={rsvps[event.id] ?? null}
                                        onRsvp={toggleRSVP}
                                        rsvpPending={pendingEventId === event.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MarketPlace;
