import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, UserMinus, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInitials } from "@/utils/user-utils";
import {
  addCommunityMember,
  findAddableUsers,
  getCommunityMembers,
  inviteToCommunity,
  removeCommunityMember,
  type CommunityMember,
  type CommunityVisibility,
} from "@/integrations/supabase/services/communities";

interface CommunityMemberListProps {
  communityId: string;
  isOwner: boolean;
  /** Decides whether the owner adds people outright or invites them. */
  visibility?: CommunityVisibility;
  onChanged: () => void;
  /**
   * "card" is the standalone panel. "plain" drops the Card and its heading for
   * use inside a drawer, which supplies both — a card inside a sheet is one
   * border too many, and two headings saying "Members" is one too many of those.
   */
  variant?: "card" | "plain";
}

type Addable = { user_id: string; name: string; profile_image: string | null; is_mentor: boolean };

export function CommunityMemberList({
  communityId,
  isOwner,
  visibility = "public",
  onChanged,
  variant = "card",
}: CommunityMemberListProps) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Addable[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<CommunityMember | null>(null);

  const load = useCallback(async () => {
    const { data } = await getCommunityMembers(communityId);
    setMembers(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  // Only the owner can add anyone, so nobody else pays for this lookup.
  useEffect(() => {
    if (!isOwner || search.trim().length < 2) {
      setCandidates([]);
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await findAddableUsers(communityId, search.trim());
      if (!active) return;
      setCandidates(data as Addable[]);
      setSearching(false);
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, isOwner, communityId]);

  /**
   * Open groups are joinable by anyone, so dropping someone straight in only
   * saves them a click. An invite-only group is a different promise: being put
   * somewhere private without being asked is not a favour, so there the owner
   * sends an invitation and the person decides.
   */
  const handleAdd = async (candidate: Addable) => {
    const invite = visibility === "private";

    const { error } = invite
      ? await inviteToCommunity(communityId, candidate.user_id)
      : await addCommunityMember(communityId, candidate.user_id);

    if (error) {
      toast.error(error.message || (invite ? "Could not send the invitation" : "Could not add them to the group"));
      return;
    }

    toast.success(invite ? `Invitation sent to ${candidate.name}` : `${candidate.name} added`);
    setSearch("");
    setCandidates([]);
    await load();
    onChanged();
  };

  const handleRemove = async (member: CommunityMember) => {
    const { error } = await removeCommunityMember(communityId, member.user_id);
    if (error) {
      toast.error("Could not remove them");
      return;
    }
    toast.success(`${member.name} removed`);
    await load();
    onChanged();
  };

  const body = (
    <div className="space-y-4">
      {isOwner && (
        <p className="text-sm text-muted-foreground">
          {visibility === "private"
            ? "You can invite mentors, and anyone you've messaged. They choose whether to accept."
            : "You can add mentors, and anyone you've messaged. Everyone else joins themselves."}
        </p>
      )}

      {isOwner && (
        <div className="space-y-2">
          <div className="relative">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                visibility === "private" ? "Invite someone by name…" : "Add someone by name…"
              }
              aria-label={
                visibility === "private"
                  ? "Search for someone to invite"
                  : "Search for someone to add"
              }
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {search.trim().length >= 2 && !searching && candidates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nobody matching. You can add mentors and people you've had a conversation with —
              share the group link and anyone else can join themselves.
            </p>
          )}

          {candidates.length > 0 && (
            <ul className="divide-y rounded-md border">
              {candidates.map((candidate) => (
                <li key={candidate.user_id} className="flex items-center gap-3 p-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={candidate.profile_image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {getInitials(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-sm">{candidate.name}</span>
                  {candidate.is_mentor && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Mentor
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleAdd(candidate)}>
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    {visibility === "private" ? "Invite" : "Add"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.user_id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={member.profile_image ?? undefined} alt="" />
                <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                {member.is_mentor ? (
                  <Link
                    to={`/mentor/${member.user_id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                  >
                    {member.name}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-medium">{member.name}</span>
                )}
              </div>

              {member.role === "owner" && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  Owner
                </Badge>
              )}

              {isOwner && member.role !== "owner" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingRemoval(member)}
                  aria-label={`Remove ${member.name}`}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const removalDialog = (
    <AlertDialog
      open={Boolean(pendingRemoval)}
      onOpenChange={(next) => !next && setPendingRemoval(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {pendingRemoval?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They'll stop being able to post here. Anything they've already posted stays, and they
            can join again unless you archive the group.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep them</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingRemoval) handleRemove(pendingRemoval);
              setPendingRemoval(null);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (variant === "plain") {
    return (
      <>
        {body}
        {removalDialog}
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Members {!loading && <span className="text-muted-foreground">({members.length})</span>}
        </CardTitle>
      </CardHeader>

      <CardContent>{body}</CardContent>
      {removalDialog}
    </Card>
  );
}

export default CommunityMemberList;
