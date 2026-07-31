
import { Check, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import MentorFormCancel from "./MentorFormCancel";

interface MentorFormActionsProps {
  isSubmitting: boolean;
  isEditMode?: boolean;
  isDirty?: boolean;
  /** Count of fields still failing validation, for the helper line. */
  remaining?: number;
  /** Rendered instead of Cancel on the last step of the stepped form. */
  backButton?: React.ReactNode;
}

const MentorFormActions = ({
  isSubmitting,
  isEditMode = false,
  isDirty = false,
  remaining = 0,
  backButton,
}: MentorFormActionsProps) => (
  <div className="space-y-3 pt-2">
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
      {backButton ?? <MentorFormCancel isSubmitting={isSubmitting} isDirty={isDirty} />}

      {/* A first submission is not an application: auto_approve_mentor_application
          approves it in the same statement and the profile is live before the
          page has finished navigating. "Submit application" described a wait
          that never happens. A resubmit genuinely is one — the trigger is
          BEFORE INSERT, so an edited row goes back to 'pending' for a human. */}
      <Button type="submit" disabled={isSubmitting} size="lg" className="sm:min-w-52">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isEditMode ? "Resubmitting..." : "Setting up your profile..."}
          </>
        ) : (
          <>
            {isEditMode ? (
              <Send className="mr-2 h-4 w-4" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Resubmit application" : "Become a mentor"}
          </>
        )}
      </Button>
    </div>

    <p className="text-xs text-muted-foreground sm:text-right">
      {remaining > 0
        ? `${remaining} required field${remaining === 1 ? "" : "s"} left to complete.`
        : isEditMode
          ? "Everything looks good — we'll let you know once this has been reviewed."
          : "Your profile goes live as soon as you confirm. You can edit it any time."}
    </p>
  </div>
);

export default MentorFormActions;
