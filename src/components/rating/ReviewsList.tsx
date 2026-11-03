
import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/utils/user-utils";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_image: string | null;
}

interface ReviewsListProps {
  mentorId: string;
}

const ReviewsList = ({ mentorId }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase.rpc('get_mentor_reviews', {
          mentor_id: mentorId
        });

        if (error) {
          console.error("Error fetching reviews:", error);
          return;
        }

        setReviews(data || []);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mentorId) {
      fetchReviews();
    }
  }, [mentorId]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Date unknown";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm font-medium text-foreground">No reviews yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviews from students who have talked to this mentor appear here.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-96 w-full">
      <div className="space-y-6 pr-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-start space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.reviewer_image || undefined} alt={review.reviewer_name} />
                <AvatarFallback>{getInitials(review.reviewer_name)}</AvatarFallback>
              </Avatar>
              
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="truncate text-sm font-medium">{review.reviewer_name}</h4>
                  <span className="shrink-0 text-xs text-muted-foreground tabular">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                
                <div className="flex items-center gap-0.5" role="img" aria-label={`${review.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                
                {review.review_text && (
                  <p className="text-sm leading-relaxed text-foreground">
                    {review.review_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ReviewsList;
