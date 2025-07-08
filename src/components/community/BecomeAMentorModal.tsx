
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Star, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BecomeAMentorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BecomeAMentorModal = ({ open, onOpenChange }: BecomeAMentorModalProps) => {
  const navigate = useNavigate();

  const handleBecomeAMentor = () => {
    onOpenChange(false);
    navigate('/become-mentor');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Become a Mentor
          </DialogTitle>
          <DialogDescription className="text-left">
            Only verified mentors can create community posts. Join our mentor community to share opportunities and collaborate with students.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Share your expertise</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Connect with students</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm">Build your network</span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={handleBecomeAMentor} className="flex-1">
              Apply Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
