
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Search, Plus, Filter, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCommunityPosts, togglePostLike, checkUserLikedPost, type CommunityPost } from "@/integrations/supabase/services/community-posts";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleLike = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
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

  const handlePostClick = (postId: string) => {
    navigate(`/community-posts/${postId}`);
  };

  const handleShare = async (post: CommunityPost, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.share({
        title: post.title,
        text: post.content,
        url: `${window.location.origin}/community-posts/${post.id}`,
      });
    } catch (error) {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${window.location.origin}/community-posts/${post.id}`);
      toast.success("Link copied to clipboard!");
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
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
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

          {/* Posts Feed */}
          <div className="space-y-6">
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
                <Card 
                  key={post.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-0 shadow-sm hover:shadow-md"
                  onClick={() => handlePostClick(post.id)}
                >
                  {/* Post Header */}
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                          <AvatarImage src={post.mentor.profile_image || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {post.mentor.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                              {post.mentor.name}
                            </h3>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(post.status)}`}>
                              {post.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{post.mentor.department}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-4">
                    {/* Post Content */}
                    <div>
                      <h2 className="text-xl font-semibold mb-3 leading-tight">{post.title}</h2>
                      <p className="text-muted-foreground leading-relaxed line-clamp-3">{post.content}</p>
                    </div>

                    {/* Post Image */}
                    {post.image_url && (
                      <div className="w-full rounded-lg overflow-hidden bg-muted">
                        <img
                          src={post.image_url}
                          alt="Post image"
                          className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                    
                    {/* Post Type & Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {POST_TYPES.find(type => type.value === post.post_type)?.label || post.post_type}
                      </Badge>
                      {post.tags && post.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {post.tags && post.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.tags.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    {/* Engagement Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-6">
                        <button
                          onClick={(e) => handleLike(post.id, e)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors group"
                        >
                          <Heart className={`h-5 w-5 transition-all ${post.user_has_liked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover:scale-110'}`} />
                          <span className="font-medium">{post.likes_count}</span>
                        </button>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageCircle className="h-5 w-5" />
                          <span className="font-medium">{post.comments_count}</span>
                        </div>

                        <button
                          onClick={(e) => handleShare(post, e)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-500 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {post.post_type !== 'general' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePostClick(post.id);
                            }}
                          >
                            Show Interest
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Create Post Modal */}
        <CreatePostModal 
          open={showCreateModal} 
          onOpenChange={setShowCreateModal}
          onPostCreated={() => {
            fetchPosts();
            setShowCreateModal(false);
          }}
        />
      </div>
    </>
  );
};

export default CommunityPosts;
