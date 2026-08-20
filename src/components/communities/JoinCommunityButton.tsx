import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Lock, UserPlus } from "lucide-react";
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
 * JoinCommunityButton - Sleek, action-oriented button for community membership.
 *
 * Designed to feel light, welcoming, and decision-focused. Signed-out users
 * see a crisp "Join" / "Request" action that routes to sign-in smoothly without
 * visual clutter.
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

  // Owners and members state
  if (community.viewer_is_owner || community.viewer_is_member) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        {community.viewer_is_owner ? "Owner" : "Joined"}
      </span>
    );
  }

  if (community.is_archived) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>Archived</span>
    );
  }

  // Signed out users see a clean "Join" / "Request" button that routes to sign in
  if (!user) {
    return (
      <Button
        asChild
        size={size}
        variant="outline"
        className={cn("h-8 px-3 text-xs font-semibold rounded-lg hover:border-primary/50", className)}
      >
        <Link to={`/signin?next=/workspace-groups/${community.slug}`}>
          {isPrivate ? "Request" : "Join"}
        </Link>
      </Button>
    );
  }

  // Invited state
  if (community.viewer_has_invite) {
    return (
      <Button asChild size={size} className={cn("h-8 px-3 text-xs font-semibold rounded-lg", className)}>
        <Link to={`/workspace-groups/${community.slug}`}>Accept</Link>
      </Button>
    );
  }

  // Requested state
  if (community.viewer_has_requested) {
    return (
      <Button size={size} variant="outline" disabled className={cn("h-8 px-3 text-xs font-medium rounded-lg opacity-70", className)}>
        <Clock className="mr-1 h-3 w-3" />
        Requested
      </Button>
    );
  }

  const handleJoin = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setBusy(true);

    if (isPrivate) {
      const { error } = await requestToJoinCommunity(community.id);
      setBusy(false);

      if (error) {
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
    <Button
      size={size}
      onClick={handleJoin}
      disabled={busy}
      className={cn("h-8 px-3 text-xs font-semibold rounded-lg", className)}
    >
      {busy ? (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      ) : isPrivate ? (
        <Lock className="mr-1 h-3 w-3" />
      ) : (
        <UserPlus className="mr-1 h-3 w-3" />
      )}
      {isPrivate ? "Request" : "Join"}
    </Button>
  );
}

export default JoinCommunityButton;
