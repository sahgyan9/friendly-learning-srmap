import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Lock, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  joinCommunity,
  requestToJoinCommunity,
  type Community,
} from "@/integrations/supabase/services/communities";
import { cn } from "@/lib/utils";

interface JoinCommunityButtonProps {
  community: Community;
  /** Told what changed so the caller can patch its copy without a refetch. */
  onJoined?: (id: string, patch: Partial<Community>) => void;
  size?: "sm" | "default";
  className?: string;
}

/**
 * One button that knows all six states a viewer can be in relative to a group.
 *
 * Both the card and the group page need this and neither should be deciding it
 * for itself — the private/public split alone means "Join" and "Ask to join" are
 * different actions with different endpoints, and two copies of that logic is
 * two chances to offer someone a button that cannot work.
 *
 * It deliberately renders *something* in every state, including for signed-out
 * visitors, rather than disappearing. A card with no call to action reads as a
 * group you are not allowed into.
 */
export function JoinCommunityButton({
  community,
  onJoined,
  size = "sm",
  className,
}: JoinCommunityButtonProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const isPrivate = community.visibility === "private";

  // Owners and members have nothing to press. Said plainly rather than left
  // blank, so the state is legible at a glance on a grid of cards.
  if (community.viewer_is_owner || community.viewer_is_member) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
        {community.viewer_is_owner ? "Yours" : "Joined"}
      </span>
    );
  }

  if (community.is_archived) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>Archived</span>
    );
  }

  if (!user) {
    return (
      <Button asChild size={size} variant="outline" className={className}>
        <Link to="/signin">
          <LogIn className="mr-1.5 h-3.5 w-3.5" />
          Sign in to join
        </Link>
      </Button>
    );
  }

  // An invite is already an answer to "can I join" — sending a request on top
  // of it would be asking a question that has been answered. The invite is
  // accepted from the group page or the invites panel, so this points there.
  if (community.viewer_has_invite) {
    return (
      <Button asChild size={size} className={className}>
        <Link to={`/communities/${community.slug}`}>Accept invite</Link>
      </Button>
    );
  }

  if (community.viewer_has_requested) {
    return (
      <Button size={size} variant="outline" disabled className={className}>
        <Clock className="mr-1.5 h-3.5 w-3.5" />
        Requested
      </Button>
    );
  }

  const handleJoin = async () => {
    setBusy(true);

    if (isPrivate) {
      const { error } = await requestToJoinCommunity(community.id);
      setBusy(false);

      if (error) {
        // These come back as sentences written for a person — "You already have
        // a request waiting on this group" — so they are shown as-is.
        toast.error(error.message || "Could not send the request");
        return;
      }

      onJoined?.(community.id, { viewer_has_requested: true });
      toast.success("Request sent", {
        description: `${community.owner.name} will see it and can let you in.`,
      });
      return;
    }

    const { error } = await joinCommunity(community.id);
    setBusy(false);

    if (error) {
      toast.error(error.message || "Could not join the group");
      return;
    }

    onJoined?.(community.id, {
      viewer_is_member: true,
      member_count: community.member_count + 1,
    });
    toast.success(`You're in — ${community.name}`, {
      description: "You can post in the group now.",
    });
  };

  return (
    <Button size={size} onClick={handleJoin} disabled={busy} className={className}>
      {busy ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : isPrivate ? (
        <Lock className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
      )}
      {isPrivate ? "Ask to join" : "Join"}
    </Button>
  );
}

export default JoinCommunityButton;
