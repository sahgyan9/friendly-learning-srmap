
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mentor } from "@/types/mentor";
import { X } from "lucide-react";

interface ChatModalHeaderProps {
  mentor: Mentor;
  onClose: () => void;
}

const ChatModalHeader = ({ mentor, onClose }: ChatModalHeaderProps) => {
  return (
    <DialogHeader className="p-4 border-b">
      <div className="flex items-center">
        <img 
          src={mentor.profile_image} 
          alt={mentor.name} 
          className="h-10 w-10 rounded-full mr-3"
        />
        <div className="flex-1">
          <DialogTitle className="text-lg">{mentor.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{mentor.department}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </DialogHeader>
  );
};

export default ChatModalHeader;
