
import { Loader2 } from "lucide-react";

interface MessagesHeaderProps {
  isProcessingMentor: boolean;
}

const MessagesHeader = ({ isProcessingMentor }: MessagesHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold"></h1>
      {isProcessingMentor && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting with mentor...
        </div>
      )}
    </div>
  );
};

export default MessagesHeader;
