import { PRIMARY_DOMAIN } from "@/lib/constants";

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CalendarDays, Search, Plus, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PostCard } from "@/components/marketplace/PostCard";
import { SRMAPEventCard } from "@/components/marketplace/SRMAPEventCard";
import { useSRMAPEvents } from "@/hooks/useSRMAPEvents";
import { Button } from "@/components/ui/button";
import { fetchMarketplacePosts, fetchMarketplacePost, CategoryType, MarketplacePost, isUserAdmin } from '@/integrations/supabase/services/marketplace';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useHasVisitedEventsNav } from "@/hooks/useFeatureAnnouncement";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const MarketPlace = () => {
    const [activeCategory, setActiveCategory] = useState<string>('srmap');
    // Changed all visible 'MarketPlace' and 'Marketplace' labels to 'Events' and updated all URLs from '/marketplace' to '/events'.
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<MarketplacePost[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailPost, setDetailPost] = useState<MarketplacePost | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const { events: srmapEvents, loading: srmapLoading, error: srmapError } = useSRMAPEvents();
    const [searchParams, setSearchParams] = useSearchParams();
    const { markSeen: markEventsNavSeen } = useHasVisitedEventsNav();

    // Reaching this page is what clears the welcome tour's navbar dot.
    useEffect(() => {
        markEventsNavSeen();
    }, [markEventsNavSeen]);

    useEffect(() => {
        loadPosts();

        // Check if there's a post ID in the URL params
        const postId = searchParams.get('post');
        if (postId) {
            loadPostDetails(postId);
        }

        // Check if user is admin
        if (user) {
            checkAdminStatus();
        }
    }, [activeCategory, searchParams, user]);

    const checkAdminStatus = async () => {
        try {
            const adminStatus = await isUserAdmin();
            setIsAdmin(adminStatus);
        } catch (error) {
            console.error("Error checking admin status:", error);
        }
    };

    const loadPosts = async () => {
        if (activeCategory === 'srmap') return;
        try {
            setLoading(true);
            const supabaseCategory = (activeCategory === 'srmap' ? 'all' : activeCategory) as CategoryType;
            const data = await fetchMarketplacePosts(supabaseCategory);
            setPosts(data);
        } catch (error) {
            console.error('Error loading posts:', error);
            toast({
                title: 'Error',
                description: 'Failed to load marketplace posts',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadPostDetails = async (postId: string) => {
        try {
            const post = await fetchMarketplacePost(postId);
            if (post) {
                setDetailPost(post);
                setIsDialogOpen(true);
            }
        } catch (error) {
            console.error('Error loading post details:', error);
        }
    };

    const handleRegister = (url?: string) => {
        if (url) {
            window.open(url, '_blank');
        } else if (detailPost?.external_link) {
            window.open(detailPost.external_link, '_blank');
        }
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setDetailPost(null);
        // Remove the post parameter from the URL
        searchParams.delete('post');
        setSearchParams(searchParams);
    };

    const handleView = (id: string) => {
        // Update the URL with the post ID
        searchParams.set('post', id);
        setSearchParams(searchParams);
    };

    const handleCategoryChange = (value: string) => {
        setActiveCategory(value);
    };

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase())
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

                {/* Hero header — same design language as FeaturesShowcase cards */}
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
                      {/* Pill label — matches FeaturesShowcase numbering */}
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Events
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Events</h1>
                          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                            Official SRMAP events, ads and course materials — all in one place.
                            Never miss what's happening on campus again.
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
                                        placeholder="Search..."
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

                        <Tabs defaultValue={activeCategory} className="w-full" onValueChange={handleCategoryChange}>
                            <TabsList className="flex flex-wrap w-full h-auto p-1 gap-1">
                                <TabsTrigger value="srmap" className="text-xs sm:text-sm flex-1">University Events</TabsTrigger>
                                <TabsTrigger value="all" className="text-xs sm:text-sm flex-1">All Posts</TabsTrigger>
                                <TabsTrigger value="ads" className="text-xs sm:text-sm flex-1">Advertisements</TabsTrigger>
                                <TabsTrigger value="courses" className="text-xs sm:text-sm flex-1">Course Materials</TabsTrigger>
                            </TabsList>

                            {activeCategory !== 'srmap' && (
                            <TabsContent value={activeCategory} className="mt-6">
                                {loading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredPosts.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-lg text-muted-foreground">No posts found</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            {user ? (
                                                <Link to="/admin/events" className="text-primary hover:underline">
                                                    Click here to add a new post
                                                </Link>
                                            ) : (
                                                "Sign in to create posts"
                                            )}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredPosts.map(post => (
                                            <div key={post.id}>
                                                <PostCard
                                                    id={post.id}
                                                    title={post.title}
                                                    description={post.description}
                                                    category={post.category}
                                                    date={post.date}
                                                    author={post.author}
                                                    image={post.image_url}
                                                    onView={() => handleView(post.id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                            )}

                            <TabsContent value="srmap" className="mt-6">
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
                                ) : (
                                    (() => {
                                        const filteredEvents = srmapEvents.filter(e =>
                                            !searchQuery ||
                                            e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            e.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            e.department.toLowerCase().includes(searchQuery.toLowerCase())
                                        );

                                        if (filteredEvents.length === 0) {
                                            return (
                                                <div className="text-center py-12">
                                                    <p className="text-lg text-muted-foreground">No events match your search</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {filteredEvents.map(event => (
                                                    <SRMAPEventCard key={event.id} event={event} />
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {detailPost && (
                    <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogTitle>{detailPost.title}</DialogTitle>
                            <DialogDescription>
                                Posted by {detailPost.author} on {new Date(detailPost.date).toLocaleDateString()}
                            </DialogDescription>

                            {detailPost.image_url && (
                                <div className="w-full mb-4 bg-muted rounded-md overflow-hidden">
                                    <img
                                        src={detailPost.image_url}
                                        alt={detailPost.title}
                                        className="w-full h-auto max-h-[50vh] object-contain cursor-pointer"
                                        onClick={() => window.open(detailPost.image_url, '_blank')}
                                    />
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="whitespace-pre-line">{detailPost.description}</div>

                                {detailPost.contact_info && (
                                    <div className="mt-4 p-4 bg-muted rounded-md">
                                        <strong>Contact Information:</strong> {detailPost.contact_info}
                                    </div>
                                )}

                                {detailPost.external_link && (
                                    <div className="flex justify-end mt-4">
                                        <Button onClick={() => handleRegister()}>
                                            Register Now
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </>
    );
};

export default MarketPlace;
