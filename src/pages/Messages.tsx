
import Navbar from "@/components/Navbar";
import MessagesLayout from "@/components/messages/MessagesLayout";

const Messages = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <MessagesLayout />
        </div>
      </main>
    </div>
  );
};

export default Messages;
