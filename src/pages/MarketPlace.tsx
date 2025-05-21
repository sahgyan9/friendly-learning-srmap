
import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2 } from "lucide-react";
import { PostCard } from "@/components/marketplace/PostCard";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { fetchMarketplacePosts, fetchMarketplacePost, CategoryType, MarketplacePost, isUserAdmin } from '@/integrations/supabase/services/marketplace';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const MarketPlace = () => {
    const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [posts, setPosts] = useState<MarketplacePost[]>([]);
    const [loading, setLoading] = useState(true);
    const [detailPost, setDetailPost] = useState<MarketplacePost | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

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
        try {
            setLoading(true);
            const data = await fetchMarketplacePosts(activeCategory);
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
        setActiveCategory(value as CategoryType);
    };

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8 pt-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">MarketPlace</h1>
                        <p className="text-sm text-muted-foreground mt-1">Find university news, events, ads and more</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        </div>
                        {isAdmin && (
                            <Link to="/admin">
                                <Button variant="outline">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Admin Panel
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <Tabs defaultValue={activeCategory} className="w-full" onValueChange={handleCategoryChange}>
                        <TabsList className="grid w-full grid-cols-5 mb-8">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="news">University News</TabsTrigger>
                            <TabsTrigger value="events">Events</TabsTrigger>
                            <TabsTrigger value="ads">Advertisements</TabsTrigger>
                            <TabsTrigger value="courses">Course Materials</TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeCategory}>
                            {loading ? (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredPosts.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-lg text-muted-foreground">No posts found</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {user ? (
                                            <Link to="/admin/marketplace" className="text-primary hover:underline">
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
                            <div className="w-full aspect-video mb-4">
                                <img 
                                    src={detailPost.image_url} 
                                    alt={detailPost.title} 
                                    className="w-full h-full object-cover rounded-md"
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
    );
};

export default MarketPlace;
