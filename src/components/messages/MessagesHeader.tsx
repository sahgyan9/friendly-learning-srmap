
import { Loader2 } from "lucide-react";

interface MessagesHeaderProps {
  isProcessingMentor: boolean;
}

const MessagesHeader = ({ isProcessingMentor }: MessagesHeaderProps) => {
  if (!isProcessingMentor) return null;

  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/8 px-4 py-2.5 text-sm text-primary backdrop-blur-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      Connecting with mentor…
    </div>
  );
};

export default MessagesHeader;
