import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  decideJoinRequest,
  listJoinRequests,
  type JoinRequest,
} from "@/integrations/supabase/services/communities";
import { getInitials } from "@/utils/user-utils";
import { formatMessageTime } from "@/utils/date-utils";

interface JoinRequestsPanelProps {
  communityId: string;
  /** Refetches the group so member_count and the tab badge follow the decision. */
  onDecided: () => void;
}

/**
 * The owner's queue of people asking to join a private group.
 *
 * Approving settles the request and creates the membership in one database
 * transaction, so this never writes to community_members itself — doing both
 * from the client leaves an approved request with nobody in the group behind it
 * the first time the second call fails.
 */
const JoinRequestsPanel = ({ communityId, onDecided }: JoinRequestsPanelProps) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await listJoinRequests(communityId);
    setRequests(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (request: JoinRequest, approve: boolean) => {
    setDeciding(request.id);
    const { error } = await decideJoinRequest(request.id, approve);
    setDeciding(null);

    if (error) {
      toast.error(error.message || "Could not save that decision");
      // The row stays put on failure: removing it would hide a request that is
      // still outstanding, and the owner would never see it again.
      return;
    }

    setRequests((current) => current.filter((entry) => entry.id !== request.id));
    onDecided();

    toast.success(
      approve ? `${request.name} is in` : `Declined ${request.name}'s request`,
      approve ? { description: "They've been notified and can post now." } : undefined,
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No one's asked to join yet. Invite someone from the members list.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={request.profile_image ?? undefined} alt="" />
              <AvatarFallback className="text-xs">{getInitials(request.name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/mentor/${request.user_id}`}
                  className="font-medium hover:text-primary"
                >
                  {request.name}
                </Link>
                {request.is_mentor && (
                  <Badge variant="secondary" className="text-xs">
                    Mentor
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatMessageTime(request.created_at)}
                </span>
              </div>

              {request.message && (
                <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">
                  {request.message}
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => decide(request, true)}
                disabled={deciding === request.id}
              >
                {deciding === request.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => decide(request, false)}
                disabled={deciding === request.id}
              >
                <X className="mr-1 h-4 w-4" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default JoinRequestsPanel;
