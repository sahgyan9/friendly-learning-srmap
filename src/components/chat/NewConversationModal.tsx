import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, UserPlus, GraduationCap, MessageSquare, AlertCircle } from "lucide-react";
import { searchCampusUsers, CampusUserResult } from "@/integrations/supabase/services/chat/user.service";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { getInitials } from "@/utils/user-utils";
import { toast } from "sonner";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onConversationCreated: (conversationId: string) => void;
  initialQuery?: string;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onConversationCreated,
  initialQuery = "",
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<CampusUserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const query = searchQuery.trim();
    if (!query) {
      // Default to top recommended mentors if no search query
      setIsLoading(true);
      searchCampusUsers("a", currentUserId)
        .then((res) => setResults(res.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const users = await searchCampusUsers(query, currentUserId);
        setResults(users);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, currentUserId]);

  const handleStartChat = async (targetUser: CampusUserResult) => {
    if (!currentUserId) {
      toast.error("Please sign in to start a message thread");
      return;
    }

    setIsStarting(targetUser.id);
    try {
      const { data: conv, error } = await getOrCreateConversation(currentUserId, targetUser.id);
      if (error || !conv) {
        throw error || new Error("Failed to initialize conversation");
      }

      toast.success(`Connected with ${targetUser.name}`);
      onConversationCreated(conv.id);
      onClose();
    } catch (err) {
      console.error("Error starting chat:", err);
      toast.error("Could not start conversation. Please try again.");
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">New Message</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Search students and mentors across SRM AP
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="p-4 border-b border-border/60 bg-muted/20">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, department, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm h-9 bg-background/80"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
          {isLoading && results.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Searching campus directory...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((user) => {
              const isConnecting = isStarting === user.id;
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0 border border-border/60">
                      <AvatarImage src={user.profile_image || undefined} alt={user.name} />
                      <AvatarFallback className="text-xs font-semibold bg-primary/15 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                        {user.badge && (
                          <Badge variant="outline" className="text-3xs py-0 px-1.5 bg-primary/10 border-primary/20 text-primary">
                            {user.badge}
                          </Badge>
                        )}
                      </div>
                      {user.department && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          {user.department}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="shrink-0 text-xs h-8 gap-1.5 rounded-lg px-3 bg-primary hover:bg-primary/90"
                    disabled={isConnecting}
                    onClick={() => handleStartChat(user)}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    Chat
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-muted-foreground space-y-2 px-4">
              <AlertCircle className="h-6 w-6 mx-auto opacity-60 text-muted-foreground" />
              <p className="text-xs">
                No students or mentors found for "<strong>{searchQuery}</strong>"
              </p>
              <p className="text-2xs text-muted-foreground/80">
                Try searching by first name or department
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
