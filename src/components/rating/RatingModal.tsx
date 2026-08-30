import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Trash2, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { getErrorField, getErrorMessage } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { MentorReviewData } from "@/hooks/useRating";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  mentorName: string;
  mentorImage?: string;
  existingReview?: MentorReviewData | null;
  onRatingSubmitted?: () => void;
}

const RatingModal = ({
  isOpen,
  onClose,
  mentorId,
  mentorName,
  mentorImage,
  existingReview: initialExistingReview,
  onRatingSubmitted,
}: RatingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state when modal opens or initialExistingReview changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialExistingReview) {
      setRating(initialExistingReview.rating);
      setReviewText(initialExistingReview.review_text || "");
      setReviewId(initialExistingReview.id);
    } else if (user?.id && mentorId) {
      // Query directly in case it wasn't passed down
      supabase
        .from("mentor_reviews")
        .select("id, rating, review_text")
        .eq("mentor_id", mentorId)
        .eq("reviewer_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setRating(data.rating);
            setReviewText(data.review_text || "");
            setReviewId(data.id);
          } else {
            setRating(0);
            setReviewText("");
            setReviewId(null);
          }
        });
    } else {
      setRating(0);
      setReviewText("");
      setReviewId(null);
    }
  }, [isOpen, initialExistingReview, user?.id, mentorId]);

  const handleSignIn = () => {
    onClose();
    navigate("/signin", { state: { from: location } });
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating of 1 to 5 stars");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to submit a review");
      return;
    }

    if (user.id === mentorId) {
      toast.error("You cannot rate your own mentor profile");
      return;
    }

    setIsSubmitting(true);
    try {
      if (reviewId) {
        // Update existing review
        const { error } = await supabase
          .from("mentor_reviews")
          .update({
            rating,
            review_text: reviewText.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reviewId)
          .eq("reviewer_id", user.id);

        if (error) throw error;
        toast.success("Your review has been updated!");
      } else {
        // Insert new review
        const { error } = await supabase
          .from("mentor_reviews")
          .insert({
            mentor_id: mentorId,
            reviewer_id: user.id,
            rating,
            review_text: reviewText.trim() || null,
          });

        if (error) throw error;
        toast.success("Thank you for rating this mentor!");
      }

      onRatingSubmitted?.();
      onClose();
    } catch (error: unknown) {
      console.error("Error submitting review:", error);
      const message = getErrorMessage(error, "");
      if (getErrorField(error, "code") === "23505") {
        toast.error("You have already reviewed this mentor");
      } else if (message) {
        toast.error(`Failed to submit review: ${message}`);
      } else {
        toast.error("Failed to submit review. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!reviewId || !user?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("mentor_reviews")
        .delete()
        .eq("id", reviewId)
        .eq("reviewer_id", user.id);

      if (error) throw error;

      toast.success("Your review was removed");
      setRating(0);
      setReviewText("");
      setReviewId(null);
      onRatingSubmitted?.();
      onClose();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Could not remove your review. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== "string") return "M";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const isEditing = Boolean(reviewId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Your Review" : "Rate Your Experience"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your rating and feedback for this mentor."
              : "Share feedback to help other students find the right mentor."}
          </DialogDescription>
        </DialogHeader>

        {/* Mentor Info */}
        <div className="flex items-center space-x-3 rounded-lg border bg-muted/30 p-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={mentorImage} alt={mentorName} />
            <AvatarFallback>{getInitials(mentorName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{mentorName}</h3>
            <p className="text-xs text-muted-foreground">Mentor on Friendly Learning</p>
          </div>
        </div>

        {!user ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in with your student account to rate this mentor and share your experience with
              classmates.
            </p>
            <Button onClick={handleSignIn} className="w-full gap-2 font-semibold">
              <LogIn className="h-4 w-4" />
              Sign in to rate
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-5 pt-1">
            {/* Star Rating */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex space-x-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    className="p-1 rounded-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {rating === 1
                  ? "Needs improvement"
                  : rating === 2
                  ? "Fair"
                  : rating === 3
                  ? "Good"
                  : rating === 4
                  ? "Very good"
                  : rating === 5
                  ? "Excellent mentor!"
                  : "Tap a star to rate"}
              </span>
            </div>

            {/* Review Text */}
            <div className="w-full space-y-1.5">
              <label htmlFor="mentor-review-comment" className="text-sm font-medium text-foreground">
                Share your experience (optional)
              </label>
              <Textarea
                id="mentor-review-comment"
                placeholder="How did this mentor help you? (e.g. course advice, project guidance, career tips)..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none text-sm"
              />
              <p className="text-right text-2xs text-muted-foreground">
                {reviewText.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full pt-1">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                  aria-label="Delete review"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isDeleting || rating === 0}
                className="flex-1 font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : isEditing ? (
                  "Update Review"
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
