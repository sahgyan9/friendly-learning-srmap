
import { Loader2 } from "lucide-react";

interface MessagesHeaderProps {
  isProcessingMentor: boolean;
}

const MessagesHeader = ({ isProcessingMentor }: MessagesHeaderProps) => {
  // The page title already lives in the hero above this component — a second
  // "Messages" heading here just repeated it. Only the connecting state
  // is this component's own information.
  if (!isProcessingMentor) return null;

  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Connecting with mentor...
    </div>
  );
};

export default MessagesHeader;
