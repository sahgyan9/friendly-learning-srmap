import { Star, UserCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FacultyRating } from "@/integrations/supabase/services/faculty";

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const FacultyReviewsList = ({ reviews, isLoading }: { reviews: FacultyRating[]; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex gap-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">No ratings yet</p>
        <p className="text-sm text-muted-foreground mt-1">Be the first to share your anonymous feedback</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[500px] w-full">
      <div className="space-y-5 pr-3">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserCircle2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-medium text-sm">Anonymous Student</span>
                  <span className="text-xs text-muted-foreground">{formatRelative(r.created_at)}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                {r.comment && (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {r.comment}
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

export default FacultyReviewsList;
