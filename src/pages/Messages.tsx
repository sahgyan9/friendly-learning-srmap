
import MessagesLayout from "@/components/messages/MessagesLayout";

const Messages = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container px-4 md:px-6">
        <MessagesLayout />
      </main>
    </div>
  );
};

export default Messages;
