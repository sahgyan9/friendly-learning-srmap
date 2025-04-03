
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface ProfileFormActionsProps {
  isLoading: boolean;
}

const ProfileFormActions = ({ isLoading }: ProfileFormActionsProps) => {
  return (
    <div className="flex justify-end pt-4">
      <Button 
        type="submit" 
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
};

export default ProfileFormActions;
