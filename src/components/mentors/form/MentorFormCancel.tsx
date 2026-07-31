import { useNavigate } from "react-router-dom";
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

interface MentorFormCancelProps {
  isSubmitting?: boolean;
  isDirty?: boolean;
}

/**
 * Cancel used to be a plain link straight to the homepage — one stray click
 * discarded a form that takes several minutes to fill in. Shared by the stepped
 * footer and the single-page edit footer so the guard can't go missing from one
 * of them.
 */
const MentorFormCancel = ({ isSubmitting = false, isDirty = false }: MentorFormCancelProps) => {
  const navigate = useNavigate();

  if (!isDirty) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="lg"
        disabled={isSubmitting}
        onClick={() => navigate("/")}
      >
        Cancel
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="lg" disabled={isSubmitting}>
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without finishing?</AlertDialogTitle>
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
  );
};

export default MentorFormCancel;
