import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Search, Plus, Filter } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCommunityPosts, togglePostLike, checkUserLikedPost, type CommunityPost } from "@/integrations/supabase/services/community-posts";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { PostDetailModal } from "@/components/community/PostDetailModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";

const POST_TYPES = [
  { value: 'all', label: 'All Posts' },
  { value: 'hackathon', label: 'Hackathon Partners' },
  { value: 'research', label: 'Research Collaboration' },
  { value: 'problem-solving', label: 'Problem Solving' },
  { value: 'project', label: 'Project Ideas' },
  { value: 'general', label: 'General Discussion' },
];

const CommunityPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await getCommunityPosts();
    
    if (error) {
      toast.error("Failed to load community posts");
      console.error(error);
    } else if (data) {
      // Check like status for each post if user is logged in
      if (user) {
        const postsWithLikeStatus = await Promise.all(
          data.map(async (post) => {
            const { liked } = await checkUserLikedPost(post.id);
            return { ...post, user_has_liked: liked };
          })
        );
        setPosts(postsWithLikeStatus);
      } else {
        setPosts(data);
      }
    }
    setLoading(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    const { error, liked } = await togglePostLike(postId);
    
    if (error) {
      toast.error("Failed to update like");
      console.error(error);
    } else {
      setPosts(posts.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              user_has_liked: liked,
              likes_count: liked ? post.likes_count + 1 : post.likes_count - 1
            }
          : post
      ));
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || post.post_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fulfilled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading community posts...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Community Posts</h1>
              <p className="text-muted-foreground">Connect, collaborate, and find partners for your projects</p>
            </div>
            
            {user && (
              <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Post
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search posts, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Posts Grid */}
          <div className="grid gap-6">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedType !== 'all' 
                    ? "Try adjusting your search or filters" 
                    : "Be the first to create a community post!"}
                </p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <Card key={post.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedPost(post)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.mentor.profile_image || undefined} />
                          <AvatarFallback>{post.mentor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{post.mentor.name}</h3>
                          <p className="text-sm text-muted-foreground">{post.mentor.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {post.image_url && (
                      <div className="mb-4 w-full max-w-md h-64 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="object-cover w-full h-full"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                    <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                    <p className="text-muted-foreground mb-4 line-clamp-3">{post.content}</p>
                    
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Post Type */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {POST_TYPES.find(type => type.value === post.post_type)?.label || post.post_type}
                      </Badge>
                      
                      <div className="flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(post.id);
                          }}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
                          {post.likes_count}
                        </button>
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MessageCircle className="h-4 w-4" />
                          {post.comments_count}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Modals */}
        <CreatePostModal 
          open={showCreateModal} 
          onOpenChange={setShowCreateModal}
          onPostCreated={() => {
            fetchPosts();
            setShowCreateModal(false);
          }}
        />

        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            open={!!selectedPost}
            onOpenChange={() => setSelectedPost(null)}
            onPostUpdated={(updatedPost) => {
              setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
            }}
            onPostDeleted={(deletedPostId) => {
              setPosts(posts.filter p => p.id !== deletedPostId));
              setSelectedPost(null);
            }}
          />
        )}
      </div>
    </>
  );
};

export default CommunityPosts;
