import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SRMAPEventCard } from "@/components/marketplace/SRMAPEventCard";
import { useSRMAPEvents } from "@/hooks/useSRMAPEvents";
import { Button } from "@/components/ui/button";
import { isUserAdmin } from '@/integrations/supabase/services/marketplace';
import { useAuth } from '@/context/AuthContext';
import { useHasVisitedEventsNav } from "@/hooks/useFeatureAnnouncement";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";

const MarketPlace = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();
    const { events: srmapEvents, loading: srmapLoading, error: srmapError } = useSRMAPEvents();
    const { markSeen: markEventsNavSeen } = useHasVisitedEventsNav();
    const cardsRef = useRef<HTMLDivElement>(null);

    // Reaching this page is what clears the welcome tour's navbar dot.
    useEffect(() => {
        markEventsNavSeen();
    }, [markEventsNavSeen]);

    // Scroll to cards before the first paint so the hero is never visible on load.
    // useLayoutEffect fires synchronously after DOM mutation but before the browser renders,
    // eliminating the flash where the hero briefly appears before scrolling away.
    useLayoutEffect(() => {
      if (cardsRef.current) {
        const navbarHeight = 64;
        const top = cardsRef.current.getBoundingClientRect().top + window.scrollY - navbarHeight;
        window.scrollTo({ top, behavior: "instant" });
      }
    }, []);

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

    const filteredEvents = srmapEvents.filter(e =>
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.department.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <SEOHead
                title={ROUTE_META["/marketplace"].title}
                description={ROUTE_META["/marketplace"].description}
                keywords="university events, campus news, student advertisements, course materials, university announcements, student hub, campus activities, educational resources"
                canonical={`${PRIMARY_DOMAIN}/marketplace`}
            />

            <StructuredData data={getBreadcrumbSchema([
                { name: "Home", url: `${PRIMARY_DOMAIN}/` },
                { name: "Events & News", url: `${PRIMARY_DOMAIN}/marketplace` }
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

                <div ref={cardsRef} className="container mx-auto px-4 py-8">
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
                                <Link to="/admin" className="w-full sm:w-auto">
                                    <Button variant="outline" className="w-full sm:w-auto">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Admin Panel
                                    </Button>
                                </Link>
                            )}
                        </div>

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
                                <p className="text-lg text-muted-foreground">No events match your search</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.map(event => (
                                    <SRMAPEventCard key={event.id} event={event} />
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
