
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatModalHeaderProps {
  receiverName: string;
  receiverImage?: string;
  onClose: () => void;
}

const ChatModalHeader = ({ receiverName, receiverImage, onClose }: ChatModalHeaderProps) => {
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DialogHeader className="p-4 border-b">
      <div className="flex items-center">
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={receiverImage} alt={receiverName} />
          <AvatarFallback>{getInitials(receiverName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <DialogTitle className="text-lg">{receiverName}</DialogTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </DialogHeader>
  );
};

export default ChatModalHeader;
