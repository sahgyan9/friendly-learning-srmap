import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MessageCircle, Edit, Trash2, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  type CommunityPost, 
  togglePostLike, 
  getPostComments, 
  addPostComment,
  deleteCommunityPost 
} from "@/integrations/supabase/services/community-posts";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { EditPostModal } from "./EditPostModal";

interface PostDetailModalProps {
  post: CommunityPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: (updatedPost: CommunityPost) => void;
  onPostDeleted: (postId: string) => void;
}

export const PostDetailModal = ({ 
  post, 
  open, 
  onOpenChange, 
  onPostUpdated, 
  onPostDeleted 
}: PostDetailModalProps) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, post.id]);

  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data, error } = await getPostComments(post.id);
    
    if (error) {
      toast.error("Failed to load comments");
      console.error(error);
    } else if (data) {
      setComments(data);
    }
    
    setLoadingComments(false);
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    const { error, liked } = await togglePostLike(currentPost.id);
    
    if (error) {
      toast.error("Failed to update like");
      console.error(error);
    } else {
      const updatedPost = {
        ...currentPost,
        user_has_liked: liked,
        likes_count: liked ? currentPost.likes_count + 1 : currentPost.likes_count - 1
      };
      setCurrentPost(updatedPost);
      onPostUpdated(updatedPost);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
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
      // Update post comments count
      const updatedPost = {
        ...currentPost,
        comments_count: currentPost.comments_count + 1
      };
      setCurrentPost(updatedPost);
      onPostUpdated(updatedPost);
    }
    
    setSubmittingComment(false);
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const { error } = await deleteCommunityPost(post.id);
    
    if (error) {
      toast.error("Failed to delete post");
      console.error(error);
    } else {
      toast.success("Post deleted successfully");
      onPostDeleted(post.id);
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

  const isPostOwner = user?.id === currentPost.mentor.id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentPost.mentor.profile_image || undefined} />
                  <AvatarFallback>{currentPost.mentor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-left">{currentPost.mentor.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{currentPost.mentor.department}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(currentPost.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStatusColor(currentPost.status)}>
                  {currentPost.status}
                </Badge>
                
                {isPostOwner && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeletePost}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Post Content */}
            <div>
              <h2 className="text-2xl font-bold mb-4">{currentPost.title}</h2>
              {currentPost.image_url && (
                <div className="mb-4 w-full bg-muted rounded overflow-hidden flex items-center justify-center">
                  <img
                    src={currentPost.image_url}
                    alt="Post image"
                    className="w-full h-auto max-h-[50vh] object-contain cursor-pointer"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    onClick={() => window.open(currentPost.image_url, '_blank')}
                  />
                </div>
              )}
              <p className="text-muted-foreground whitespace-pre-wrap">{currentPost.content}</p>
            </div>

            {/* Tags */}
            {currentPost.tags && currentPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentPost.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center gap-6 py-4 border-t border-b">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors"
              >
                <Heart className={`h-5 w-5 ${currentPost.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{currentPost.likes_count} likes</span>
              </button>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
                <span>{currentPost.comments_count} comments</span>
              </div>
            </div>

            {/* Add Comment */}
            {user && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.profile_image || undefined} />
                    <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submittingComment ? "Posting..." : "Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="space-y-4">
              <h3 className="font-semibold">Comments</h3>
              
              {loadingComments ? (
                <div className="text-center py-4">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="pt-4">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user?.profile_image || undefined} />
                            <AvatarFallback>{comment.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{comment.user?.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Modal */}
      <EditPostModal
        post={currentPost}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onPostUpdated={(updatedPost) => {
          setCurrentPost(updatedPost);
          onPostUpdated(updatedPost);
          setShowEditModal(false);
        }}
      />
    </>
  );
};
