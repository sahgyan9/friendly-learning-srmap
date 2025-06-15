
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2, Send } from "lucide-react";

interface MentorFormActionsProps {
  isSubmitting: boolean;
}

const MentorFormActions = ({ isSubmitting }: MentorFormActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 pt-6">
      <Button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 sm:flex-none"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting Application...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Application
          </>
        )}
      </Button>
      
      <Button
        type="button"
        variant="outline"
        asChild
        className="flex-1 sm:flex-none"
      >
        <Link to="/">Cancel</Link>
      </Button>
    </div>
  );
};

export default MentorFormActions;
