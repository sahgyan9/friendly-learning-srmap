
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { getErrorField, getErrorMessage } from "@/lib/errors";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  mentorName: string;
  mentorImage?: string;
  onRatingSubmitted?: () => void;
}

const RatingModal = ({
  isOpen,
  onClose,
  mentorId,
  mentorName,
  mentorImage,
  onRatingSubmitted,
}: RatingModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to submit a review");
      return;
    }

    setIsSubmitting(true);
    try {

      const { error } = await supabase
        .from("mentor_reviews")
        .insert({
          mentor_id: mentorId,
          reviewer_id: user.id,
          rating,
          review_text: reviewText.trim() || null,
        });

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      toast.success("Thank you for your review!");
      onRatingSubmitted?.();
      onClose();
      
      // Reset form
      setRating(0);
      setReviewText("");
    } catch (error: unknown) {
      console.error("Error submitting review:", error);
      const message = getErrorMessage(error, "");
      if (getErrorField(error, 'code') === '23505') {
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

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'M';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Mentor Info */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={mentorImage} alt={mentorName} />
              <AvatarFallback>{getInitials(mentorName)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{mentorName}</h3>
              <p className="text-sm text-muted-foreground">How was your experience?</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Review Text */}
          <div className="w-full space-y-2">
            <label className="text-sm font-medium">
              Share your experience (optional)
            </label>
            <Textarea
              placeholder="Tell others about your mentoring experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reviewText.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || rating === 0}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
