
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, ArrowLeft, Send, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  getCommunityPosts, 
  togglePostLike, 
  checkUserLikedPost, 
  getPostComments, 
  addPostComment,
  type CommunityPost 
} from "@/integrations/supabase/services/community-posts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const POST_TYPES = [
  { value: 'hackathon', label: 'Hackathon Partners' },
  { value: 'research', label: 'Research Collaboration' },
  { value: 'problem-solving', label: 'Problem Solving' },
  { value: 'project', label: 'Project Ideas' },
  { value: 'general', label: 'General Discussion' },
];

const CommunityPostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId]);

  const fetchPost = async () => {
    setLoading(true);
    const { data, error } = await getCommunityPosts();
    
    if (error) {
      toast.error("Failed to load post");
      console.error(error);
      navigate('/community');
    } else if (data) {
      const foundPost = data.find(p => p.id === postId);
      if (foundPost) {
        if (user) {
          const { liked } = await checkUserLikedPost(foundPost.id);
          setPost({ ...foundPost, user_has_liked: liked });
        } else {
          setPost(foundPost);
        }
      } else {
        toast.error("Post not found");
        navigate('/community');
      }
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!postId) return;
    
    setLoadingComments(true);
    const { data, error } = await getPostComments(postId);
    
    if (error) {
      toast.error("Failed to load comments");
      console.error(error);
    } else if (data) {
      setComments(data);
    }
    
    setLoadingComments(false);
  };

  const handleLike = async () => {
    if (!user || !post) {
      toast.error("Please sign in to like posts");
      return;
    }

    const { error, liked } = await togglePostLike(post.id);
    
    if (error) {
      toast.error("Failed to update like");
      console.error(error);
    } else {
      setPost({
        ...post,
        user_has_liked: liked,
        likes_count: liked ? post.likes_count + 1 : post.likes_count - 1
      });
    }
  };

  const handleAddComment = async () => {
    if (!user || !post) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const { data, error } = await addPostComment(post.id, newComment.trim());
    
    if (error) {
      toast.error("Failed to add comment");
      console.error(error);
    } else if (data) {
      setComments([...comments, data]);
      setNewComment("");
      setPost({
        ...post,
        comments_count: post.comments_count + 1
      });
    }
    
    setSubmittingComment(false);
  };

  const handleShare = async () => {
    if (!post) return;
    
    try {
      await navigator.share({
        title: post.title,
        text: post.content,
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

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
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <Card>
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
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Post not found</h3>
            <Link to="/community">
              <Button variant="outline">Back to Community Posts</Button>
            </Link>
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
          {/* Back Navigation */}
          <div className="mb-6">
            <Link to="/community">
              <Button variant="ghost" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Community Posts
              </Button>
            </Link>
          </div>

          {/* Post Content */}
          <Card className="mb-8">
            {/* Post Header */}
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-background shadow-lg">
                    <AvatarImage src={post.mentor.profile_image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {post.mentor.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">{post.mentor.name}</h3>
                      <Badge variant="outline" className={getStatusColor(post.status)}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{post.mentor.department}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Title and Content */}
              <div>
                <h1 className="text-3xl font-bold mb-4 leading-tight">{post.title}</h1>
                <div className="prose prose-gray max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>

              {/* Post Image */}
              {post.image_url && (
                <div className="w-full rounded-xl overflow-hidden">
                  <img
                    src={post.image_url}
                    alt="Post image"
                    className="w-full h-auto object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}

              {/* Post Type & Tags */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                  {POST_TYPES.find(type => type.value === post.post_type)?.label || post.post_type}
                </Badge>
                {post.tags && post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Engagement Bar */}
              <div className="flex items-center justify-between py-4 border-y border-border/50">
                <div className="flex items-center gap-8">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-3 text-muted-foreground hover:text-red-500 transition-colors group"
                  >
                    <Heart className={`h-6 w-6 transition-all ${post.user_has_liked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-medium">{post.likes_count} likes</span>
                  </button>
                  
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MessageCircle className="h-6 w-6" />
                    <span className="font-medium">{post.comments_count} comments</span>
                  </div>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-3 text-muted-foreground hover:text-blue-500 transition-colors"
                  >
                    <Share2 className="h-5 w-5" />
                    <span className="font-medium">Share</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  {post.post_type !== 'general' && (
                    <Button className="px-6">
                      Show Interest
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Bookmark className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Comment Section */}
          {user && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.profile_image || undefined} />
                    <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Write a thoughtful comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {submittingComment ? "Posting..." : "Comment"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Comments ({post.comments_count})</h3>
            
            {loadingComments ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <p className="text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-4">
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={comment.user?.profile_image || undefined} />
                          <AvatarFallback>{comment.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">{comment.user?.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-foreground leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CommunityPostDetail;
