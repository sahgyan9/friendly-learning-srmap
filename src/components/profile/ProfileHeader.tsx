
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ProfileHeaderProps {
  onRefresh: () => Promise<void>;
  isMentor: boolean;
}

const ProfileHeader = ({ onRefresh, isMentor }: ProfileHeaderProps) => {
  return (
    <div className="mb-8 text-center">
      <div className="flex items-center justify-center gap-2">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRefresh} 
          title="Refresh profile data"
          className="ml-2"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-muted-foreground mt-2">
        {isMentor 
          ? "You're registered as a mentor. Edit your profile details below." 
          : "Manage your account information"}
      </p>
    </div>
  );
};

export default ProfileHeader;
