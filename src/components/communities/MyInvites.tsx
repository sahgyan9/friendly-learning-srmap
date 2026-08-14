import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  listMyInvites,
  respondToInvite,
  type MyInvite,
} from "@/integrations/supabase/services/communities";

/**
 * Invitations waiting on the signed-in viewer.
 *
 * Renders nothing at all when there are none. An invitation to a private group
 * is otherwise invisible — the group looks identical in the directory whether
 * you have been invited or not — so without somewhere to surface it the owner's
 * invite quietly goes nowhere.
 */
const MyInvites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invites, setInvites] = useState<MyInvite[]>([]);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    // The RPC is for authenticated callers, and a signed-out visitor has no
    // invitations by definition. Calling it anyway put a failed request and a
    // console error on every anonymous visit to /communities.
    if (!user) {
      setInvites([]);
      return;
    }

    const { data } = await listMyInvites();
    setInvites(data);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (invite: MyInvite, accept: boolean) => {
    setDeciding(invite.id);
    const { error } = await respondToInvite(invite.id, accept);
    setDeciding(null);

    if (error) {
      toast.error(error.message || "Could not respond to that invitation");
      return;
    }

    setInvites((current) => current.filter((entry) => entry.id !== invite.id));

    if (accept) {
      toast.success(`You're in — welcome to ${invite.community_name}`);
      navigate(`/workspace-groups/${invite.community_slug}`);
      return;
    }

    toast.success("Invitation declined");
  };

  if (invites.length === 0) return null;

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Mail className="h-4 w-4 text-primary" />
          {invites.length === 1 ? "You've been invited to a group" : "Your invitations"}
        </h2>

        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center"
          >
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{invite.community_name}</span>
              {invite.invited_by_name && (
                <span className="text-muted-foreground"> — from {invite.invited_by_name}</span>
              )}
            </p>

            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => respond(invite, true)}
                disabled={deciding === invite.id}
              >
                {deciding === invite.id && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(invite, false)}
                disabled={deciding === invite.id}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MyInvites;
