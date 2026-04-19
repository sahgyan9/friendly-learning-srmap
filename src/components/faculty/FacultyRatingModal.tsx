import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { facultyService, type MyFacultyRating } from "@/integrations/supabase/services/faculty";
import { Link } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  facultyId: string;
  facultyName: string;
  existing: MyFacultyRating | null;
  onSubmitted: () => void;
}

const FacultyRatingModal = ({ open, onClose, facultyId, facultyName, existing, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(existing?.rating || 0);
      setComment(existing?.comment || "");
    }
  }, [open, existing]);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
            <DialogDescription>You must be signed in to rate a faculty member.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button asChild><Link to="/signin">Sign in</Link></Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }
    if (comment.length > 500) {
      toast.error("Comment must be 500 characters or less");
      return;
    }
    setSubmitting(true);
    try {
      await facultyService.submitRating({
        facultyId,
        userId: user.id,
        rating,
        comment: comment.trim() || null,
      });
      toast.success(existing ? "Rating updated" : "Thanks for your anonymous rating!");
      onSubmitted();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Update your rating" : "Rate"} {facultyName}</DialogTitle>
          <DialogDescription>
            Your rating is fully anonymous. Reviewers are never displayed publicly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${s} star${s > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-9 w-9 transition-colors ${
                  s <= (hover || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Share your experience (optional, max 500 chars)…"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={4}
          />
          <div className="text-right text-xs text-muted-foreground">{comment.length}/500</div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || rating < 1}>
            {submitting ? "Submitting…" : existing ? "Update" : "Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FacultyRatingModal;
