import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EyeOff, Loader2, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import {
  RATING_CRITERIA,
  REVIEW_TAGS,
  deleteMyFacultyRating,
  getMyFacultyRating,
  submitFacultyRating,
  type Faculty,
} from "@/integrations/supabase/services/faculty";
import { StarInput } from "./StarRating";

interface FacultyRatingModalProps {
  faculty: Faculty | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const EMPTY = { teaching: 0, grading: 0, helpfulness: 0 };

export function FacultyRatingModal({
  faculty,
  open,
  onOpenChange,
  onSubmitted,
}: FacultyRatingModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [scores, setScores] = useState(EMPTY);
  const [comment, setComment] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load any existing rating so the modal opens pre-filled and the student edits
  // rather than being told "you already rated this".
  useEffect(() => {
    if (!open || !faculty || !user) return;

    let cancelled = false;
    setLoading(true);

    getMyFacultyRating(faculty.id).then(({ data }) => {
      if (cancelled) return;

      if (data) {
        setScores({
          teaching: data.teaching,
          grading: data.grading,
          helpfulness: data.helpfulness,
        });
        setComment(data.comment ?? "");
        setCourseCode(data.course_code ?? "");
        setTags(data.tags ?? []);
        setIsEditing(true);
      } else {
        setScores(EMPTY);
        setComment("");
        setCourseCode("");
        setTags([]);
        setIsEditing(false);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, faculty, user]);

  if (!faculty) return null;

  const complete = RATING_CRITERIA.every((criterion) => scores[criterion.key] > 0);
  const overall = complete
    ? (scores.teaching + scores.grading + scores.helpfulness) / 3
    : 0;

  const handleSignIn = () => {
    onOpenChange(false);
    navigate("/signin", { state: { from: location } });
  };

  const handleSubmit = async () => {
    if (!complete) {
      toast.error("Rate all three areas first");
      return;
    }

    setSubmitting(true);
    const { error } = await submitFacultyRating(faculty.id, {
      ...scores,
      comment,
      courseCode,
      tags,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not save your rating");
      return;
    }

    toast.success(isEditing ? "Rating updated" : "Thanks! Your anonymous rating is live.");
    onOpenChange(false);
    onSubmitted?.();
  };

  const handleDelete = async () => {
    setSubmitting(true);
    const { error } = await deleteMyFacultyRating(faculty.id);
    setSubmitting(false);

    if (error) {
      toast.error("Could not remove your rating");
      return;
    }

    toast.success("Your rating was removed");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit your rating" : "Rate this faculty member"}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            Completely anonymous — your name is never shown or stored with the review.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={faculty.image_url ?? undefined} alt={faculty.name} />
            <AvatarFallback>{getInitials(faculty.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{faculty.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[faculty.designation, faculty.department].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        {!user ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in to rate. We only use your account to make sure each student rates once —
              your review stays anonymous.
            </p>
            <Button onClick={handleSignIn} className="w-full">
              Sign in to rate
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {RATING_CRITERIA.map((criterion) => (
                <StarInput
                  key={criterion.key}
                  label={criterion.label}
                  hint={criterion.hint}
                  value={scores[criterion.key]}
                  onChange={(value) => setScores((current) => ({ ...current, [criterion.key]: value }))}
                  disabled={submitting}
                />
              ))}
            </div>

            {complete && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-sm">
                <span className="font-medium">Overall</span>
                <span className="text-lg font-bold tabular-nums text-primary">
                  {overall.toFixed(1)}
                </span>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>What stood out? (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {REVIEW_TAGS.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={submitting || (!selected && tags.length >= 6)}
                      onClick={() =>
                        setTags((current) =>
                          selected ? current.filter((item) => item !== tag) : [...current, tag],
                        )
                      }
                      aria-pressed={selected}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-40",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course-code">Course you took with them (optional)</Label>
              <Input
                id="course-code"
                placeholder="e.g. CSE202"
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value)}
                maxLength={32}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-comment">Your review (optional)</Label>
              <Textarea
                id="review-comment"
                placeholder="What should other students know before taking a course with them?"
                rows={4}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={1000}
                disabled={submitting}
              />
              <p className="text-right text-xs text-muted-foreground">{comment.length}/1000</p>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {isEditing ? (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting || !complete}>
                  {submitting ? "Saving..." : isEditing ? "Update rating" : "Submit rating"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FacultyRatingModal;
