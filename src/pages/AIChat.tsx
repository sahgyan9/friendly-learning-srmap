
import React, { useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, User } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  mentors?: Mentor[];
}

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: "Hello! I'm Friendly AI. Ask me anything, or seek help from our mentors.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const resp = await fetch("https://ruapdkrgcbqrhvsayvpf.supabase.co/functions/v1/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })) }),
      });

      const data = await resp.json();
      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          content: data.answer,
          mentors: data.mentors || [],
        }
      ]);
      setInput("");
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: "bot",
          content: "Sorry, something went wrong!",
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim() && !loading) {
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex flex-col flex-1 items-center pt-24">
        <Card className="w-full max-w-lg h-[70vh] flex flex-col shadow-xl">
          <div className="p-4 flex-1 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`rounded-xl px-4 py-2 text-sm max-w-[70%] whitespace-pre-wrap
                  ${msg.role === "user"
                      ? "bg-primary text-white rounded-br-sm flex items-center gap-1"
                      : "bg-muted text-foreground rounded-bl-sm flex items-center gap-1"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                  <span>{msg.content}</span>
                </div>
              </div>
            ))}
            {/* Mentor suggestions if present */}
            {messages[messages.length - 1]?.mentors && messages[messages.length - 1].mentors!.length > 0 && (
              <div className="mb-3 mt-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-bold mb-2 text-sm">Mentor(s) you may like:</div>
                <div className="flex flex-wrap gap-3">
                  {messages[messages.length - 1].mentors!.map((mentor) => (
                    <Link to={`/mentor/${mentor.id}`} key={mentor.id} className="group flex items-center gap-2 border border-primary rounded-md p-2 bg-background hover:bg-primary/10 transition">
                      <img src={mentor.profile_image} className="w-8 h-8 rounded-full border" alt={mentor.name} />
                      <div>
                        <div className="font-semibold">{mentor.name}</div>
                        <div className="text-xs text-muted-foreground">{mentor.department}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          {/* User input */}
          <div className="border-t border-gray-200 dark:border-gray-700 flex">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Type your question..."
              className="flex-1 border-0 focus:ring-0 focus-visible:ring-0 bg-transparent"
              disabled={loading}
              aria-label="Ask Friendly AI"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || loading} className="h-auto rounded-none rounded-r-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AIChat;
