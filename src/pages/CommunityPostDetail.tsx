
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
  getCommunityPostById,
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
  const { id: postId } = useParams<{ id: string }>();
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
    const { data, error } = await getCommunityPostById(postId!);

    if (error || !data) {
      toast.error("Failed to load post");
      console.error(error);
      navigate('/community-posts');
    } else {
      if (user) {
        const { liked } = await checkUserLikedPost(data.id);
        setPost({ ...data, user_has_liked: liked });
      } else {
        setPost(data);
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
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-4 bg-gray-200 rounded w-20 sm:w-32"></div>
            <Card>
              <CardHeader className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="rounded-full bg-gray-200 h-12 w-12 sm:h-12 sm:w-12"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 sm:w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 sm:w-24"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-24 sm:h-32 bg-gray-200 rounded"></div>
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
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
          <div className="text-center py-8 sm:py-12">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Post not found</h3>
            <Link to="/community-posts">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Back to Community Posts</Button>
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
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
          {/* Back Navigation */}
          <div className="mb-4 sm:mb-6">
            <Link to="/community-posts">
              <Button variant="ghost" className="flex items-center gap-2 text-sm sm:text-base">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Community Posts</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>

          {/* Post Content */}
          <Card className="mb-6 sm:mb-8">
            {/* Post Header */}
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16 ring-2 ring-background shadow-lg flex-shrink-0">
                    <AvatarImage src={post.mentor.profile_image || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm sm:text-lg">
                      {post.mentor.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold truncate">{post.mentor.name}</h3>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${getStatusColor(post.status)}`}>
                        {post.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{post.mentor.department}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0 ml-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6">
              {/* Title and Content */}
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 leading-tight">{post.title}</h1>
                <div className="prose prose-gray max-w-none">
                  <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>

              {/* Post Image */}
              {post.image_url && (
                <div className="w-full rounded-lg sm:rounded-xl overflow-hidden">
                  <img
                    src={post.image_url}
                    alt="Post image"
                    className="w-full h-auto object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}

              {/* Post Type & Tags */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Badge variant="secondary" className="text-xs sm:text-sm font-medium px-2 sm:px-3 py-1">
                  {POST_TYPES.find(type => type.value === post.post_type)?.label || post.post_type}
                </Badge>
                {post.tags && post.tags.slice(0, window.innerWidth < 640 ? 2 : post.tags.length).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs sm:text-sm">
                    #{tag}
                  </Badge>
                ))}
                {post.tags && post.tags.length > 2 && window.innerWidth < 640 && (
                  <span className="text-xs text-muted-foreground">
                    +{post.tags.length - 2} more
                  </span>
                )}
              </div>

              {/* Footer - Single row like Image 1 */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleLike}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Heart className={`h-3 w-3 ${post.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
                    {post.likes_count}
                  </button>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    {post.comments_count}
                  </div>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-500 transition-colors"
                  >
                    <Share2 className="h-3 w-3" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {post.post_type !== 'general' && (
                    <Button size="sm" className="h-6 px-3 text-xs">
                      Connect
                    </Button>
                  )}
                  <button className="p-1 hover:bg-muted rounded">
                    <Bookmark className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Comment Section */}
          {user && (
            <Card className="mb-6 sm:mb-8">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex gap-3 sm:gap-4">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src={profile?.profile_image || undefined} />
                    <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                    <Textarea
                      placeholder="Write a thoughtful comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="resize-none text-sm sm:text-base"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="flex items-center gap-2 text-sm"
                        size="sm"
                      >
                        <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                        {submittingComment ? "Posting..." : "Comment"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold">Comments ({post.comments_count})</h3>

            {loadingComments ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-3 sm:pt-4">
                      <div className="flex gap-3">
                        <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-20 sm:w-24"></div>
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <Card>
                <CardContent className="pt-4 sm:pt-6 text-center py-8 sm:py-12">
                  <p className="text-sm sm:text-base text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="pt-3 sm:pt-4">
                      <div className="flex gap-3 sm:gap-4">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                          <AvatarImage src={comment.user?.profile_image || undefined} />
                          <AvatarFallback>{comment.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                            <span className="font-semibold text-sm sm:text-base truncate">{comment.user?.name}</span>
                            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-foreground leading-relaxed break-words">{comment.content}</p>
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
