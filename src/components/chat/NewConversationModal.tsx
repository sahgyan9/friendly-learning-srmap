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
import { Search, Loader2, UserPlus, GraduationCap, MessageSquare, AlertCircle, Users } from "lucide-react";
import type { CampusUserResult } from "@/integrations/supabase/services/chat/user.service";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { getInitials, getBadgeVariant } from "@/utils/user-utils";
import { useCampusUserSearch } from "@/hooks/useCampusUserSearch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [isStarting, setIsStarting] = useState<string | null>(null);
  // Suggested-members view (empty query) should feel instant; an active
  // search still debounces normally.
  const { results, isSearching: isLoading } = useCampusUserSearch(searchQuery, currentUserId, {
    searchOnEmpty: true,
    debounceMs: 200,
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">New message</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Search students, mentors, and peers across SRM AP
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, department, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 text-sm"
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
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Searching campus directory...</span>
            </div>
          ) : results.length > 0 ? (
            <>
              {!searchQuery.trim() && (
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  <span>Campus members</span>
                </div>
              )}
              {results.map((user) => {
                const isConnecting = isStarting === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => !isConnecting && handleStartChat(user)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-accent transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={user.profile_image || undefined} alt={user.name} />
                        <AvatarFallback className="text-xs font-semibold bg-secondary text-secondary-foreground">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {user.name}
                          </p>
                          {user.badge && (
                            <Badge
                              variant="outline"
                              className={cn("text-3xs py-0 px-1.5 font-medium", getBadgeVariant(user.badge))}
                            >
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
                      variant="outline"
                      className="shrink-0 text-xs h-8 gap-1.5 px-3"
                      isLoading={isConnecting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChat(user);
                      }}
                    >
                      {!isConnecting && <MessageSquare className="h-3.5 w-3.5" />}
                      Chat
                    </Button>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="py-10 text-center text-muted-foreground space-y-2 px-4">
              <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs">
                No students or mentors found for "<strong>{searchQuery}</strong>"
              </p>
              <p className="text-2xs text-muted-foreground">
                Try a first name or a department
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
