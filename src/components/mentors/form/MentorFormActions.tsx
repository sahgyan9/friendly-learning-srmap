
import { useNavigate } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MentorFormActionsProps {
  isSubmitting: boolean;
  isEditMode?: boolean;
  isDirty?: boolean;
  /** Count of fields still failing validation, for the helper line. */
  remaining?: number;
}

const MentorFormActions = ({
  isSubmitting,
  isEditMode = false,
  isDirty = false,
  remaining = 0,
}: MentorFormActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        {/* Cancel used to be a plain link straight to the homepage — one stray
            click discarded a form that takes several minutes to fill in. */}
        {isDirty ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="lg" disabled={isSubmitting}>
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard your application?</AlertDialogTitle>
                <AlertDialogDescription>
                  Nothing you've typed has been saved yet. Leaving now loses it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction onClick={() => navigate("/")}>Discard</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={isSubmitting}
            onClick={() => navigate("/")}
          >
            Cancel
          </Button>
        )}

        <Button type="submit" disabled={isSubmitting} size="lg" className="sm:min-w-52">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? "Resubmitting..." : "Submitting..."}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {isEditMode ? "Resubmit application" : "Submit application"}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground sm:text-right">
        {remaining > 0
          ? `${remaining} required field${remaining === 1 ? "" : "s"} left to complete.`
          : "Everything looks good — applications are usually reviewed within a few days."}
      </p>
    </div>
  );
};

export default MentorFormActions;
