
import { Button } from "@/components/ui/button";

interface ChatModalErrorProps {
  error: string | null;
  onRetry: () => void;
}

const ChatModalError = ({ error, onRetry }: ChatModalErrorProps) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-500 mb-2">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    </div>
  );
};

export default ChatModalError;
