
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPostComments, addPostComment, type PostComment } from "@/integrations/supabase/services/community-posts";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/utils/user-utils";
import { toast } from "sonner";

interface InlineCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
}

export const InlineComments = ({ postId, onCommentAdded }: InlineCommentsProps) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPostComments(postId);
      
      if (error) {
        console.error("Error fetching comments:", error);
        toast.error("Failed to load comments");
      } else if (data) {
        setComments(data);
      }
    } catch (error) {
      console.error("Unexpected error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await addPostComment(postId, newComment.trim());

      if (error) {
        console.error("Error adding comment:", error);
        toast.error("Failed to add comment");
      } else {
        setNewComment("");
        // Re-read rather than appending locally: the insert goes through RLS and
        // the RPC is what resolves the author's public profile.
        await fetchComments();
        onCommentAdded?.();
      }
    } catch (error) {
      console.error("Unexpected error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading comments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm">Comments ({comments.length})</h4>
      
      {/* Add Comment */}
      {user && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.profile_image || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(profile?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || submitting}
                size="sm"
                className="text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="border-0 shadow-none bg-muted/30">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={comment.author.profile_image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(comment.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.author.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{comment.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
