
import MessagesLayout from "@/components/messages/MessagesLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const Messages = () => {
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen bg-background text-foreground ${isMobile ? '' : 'pt-24 pb-16'}`}>
      <div className={`${isMobile ? 'h-screen' : 'container px-4 md:px-6'}`}>
        <MessagesLayout />
      </div>
    </div>
  );
};

export default Messages;
