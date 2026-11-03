
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Send, User, UserX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPostComments, addPostComment, type PostComment } from "@/integrations/supabase/services/community-posts";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/utils/user-utils";
import { toast } from "sonner";
import { LinkifiedText } from "@/components/common/LinkifiedText";
import { WellbeingHelpCard } from "@/components/wellbeing/WellbeingHelpCard";
import { detectDistressText } from "@/lib/wellbeing/distress-keywords";

interface InlineCommentsProps {
  postId: string;
  onCommentAdded?: () => void;
}

export const InlineComments = ({ postId, onCommentAdded }: InlineCommentsProps) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
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
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async () => {
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await addPostComment(postId, newComment.trim(), isAnonymous);

      if (error) {
        console.error("Error adding comment:", error);
        toast.error("Could not post comment");
      } else {
        setNewComment("");
        setIsAnonymous(false);
        // Re-read rather than appending locally: the insert goes through RLS and
        // the RPC is what resolves the author's public profile.
        await fetchComments();
        onCommentAdded?.();
      }
    } catch (error) {
      console.error("Unexpected error adding comment:", error);
      toast.error("Could not post comment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading comments">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Comments <span className="tabular font-normal text-muted-foreground">{comments.length}</span></h4>
      
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
              placeholder="Write a comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            {detectDistressText(newComment) && (
              <WellbeingHelpCard compact />
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <label htmlFor={`anon-comment-${postId}`} className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                <Switch
                  id={`anon-comment-${postId}`}
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  className="scale-75 origin-left"
                />
                <span className="flex items-center gap-1">
                  <UserX className="h-3 w-3" aria-hidden="true" />
                  Comment anonymously
                </span>
              </label>
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                isLoading={submitting}
                size="sm"
              >
                {!submitting && <Send className="h-4 w-4" />}
                {submitting ? "Posting" : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet.
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="border-0 shadow-none bg-muted/30">
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {comment.is_anonymous ? (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                  ) : (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.author.profile_image || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.is_anonymous ? "Anonymous student" : comment.author.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                      {comment.is_anonymous && comment.viewer_is_author && (
                        <span className="text-2xs text-primary font-medium">Only you see this is yours</span>
                      )}
                    </div>
                    <div className="text-sm text-foreground">
                      <LinkifiedText text={comment.content} />
                    </div>
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
