
import { Button } from "@/components/ui/button";

interface ChatModalErrorProps {
  error: string;
}

const ChatModalError = ({ error }: ChatModalErrorProps) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-red-500 mb-2">{error}</p>
      </div>
    </div>
  );
};

export default ChatModalError;
