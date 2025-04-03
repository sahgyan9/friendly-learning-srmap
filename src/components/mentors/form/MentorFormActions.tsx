
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface MentorFormActionsProps {
  isSubmitting: boolean;
}

const MentorFormActions = ({ isSubmitting }: MentorFormActionsProps) => {
  return (
    <div className="flex justify-end space-x-4 pt-4">
      <Button type="button" variant="outline" asChild>
        <Link to="/">Cancel</Link>
      </Button>
      <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Application"
        )}
      </Button>
    </div>
  );
};

export default MentorFormActions;
