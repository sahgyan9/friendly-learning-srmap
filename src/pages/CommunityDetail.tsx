import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Globe,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { CommunityMemberList } from "@/components/communities/CommunityMemberList";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { InviteLinkButton } from "@/components/communities/InviteLinkButton";
import JoinRequestDialog from "@/components/communities/JoinRequestDialog";
import JoinRequestsPanel from "@/components/communities/JoinRequestsPanel";
import { CommunityGroupChat } from "@/components/communities/CommunityGroupChat";
import { EditCommunityModal } from "@/components/communities/EditCommunityModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { formatRelativeTime } from "@/utils/date-utils";
import {
  deleteCommunity,
  getCommunityBySlug,
  getCommunityKindMeta,
  joinCommunity,
  leaveCommunity,
  listMyInvites,
  respondToInvite,
  type Community,
} from "@/integrations/supabase/services/communities";
import {
  getCommunityPosts,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

/**
 * A group is a room, not a card.
 *
 * The page used to be a bordered header card above a tab strip — "Posts &
 * Discussions" | "Group Chat" — beside a fixed 20rem member panel. That gave a
 * quarter of the screen to a list of three avatars, and split an already quiet
 * room across two tabs, one of which was empty in every group on the site.
 *
 * Now: one header that is part of the page rather than a box sitting on it, one
 * conversation with the posts folded into it, full width. Members moved behind
 * the member count, which is where people look for them anyway.
 */
const CommunityDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The join-request notification deep-links to ?tab=requests, from back when
  // requests were a tab. The panel is inline now and normally only appears when
  // there is something in it, but arriving from that link must always land on
  // something — including the reassuring empty case after the owner has already
  // dealt with the request from somewhere else.
  const cameForRequests = searchParams.get("tab") === "requests";

  const loadPosts = useCallback(async (communityId: string) => {
    const { data } = await getCommunityPosts({ communityId, limit: 50 });
    setPosts(data ?? []);
  }, []);

  const load = useCallback(async () => {
    if (!slug) return;

    const { data, error } = await getCommunityBySlug(slug);
    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setCommunity(data);

    // Skipped rather than fetched-and-discarded when the viewer cannot see
    // inside: the database would return zero rows anyway, and asking for posts
    // the caller has no claim on is a request worth not making.
    if (data.viewer_can_view !== false) {
      await loadPosts(data.id);
    } else {
      setPosts([]);
    }

    setLoading(false);
  }, [slug, loadPosts]);

  useEffect(() => {
    load();
  }, [load]);

  const handleJoin = async () => {
    if (!user) {
      navigate("/signin");
      return;
    }
    if (!community) return;

    setWorking(true);
    const { error } = await joinCommunity(community.id);
    setWorking(false);

    if (error) {
      toast.error("Could not join the group");
      return;
    }

    toast.success(`You're in — welcome to ${community.name}`, {
      description: "You can post here now.",
    });
    load();
  };

  const handleAcceptInvite = async () => {
    if (!community) return;

    // The invite id is not on the community row, so this reads the viewer's
    // outstanding invites and matches on the group. There is only ever one
    // pending invite per person per group.
    const { data: invites } = await listMyInvites();
    const invite = invites.find((entry) => entry.community_id === community.id);
    if (!invite) {
      toast.error("That invitation is no longer available");
      load();
      return;
    }

    setWorking(true);
    const { error } = await respondToInvite(invite.id, true);
    setWorking(false);

    if (error) {
      toast.error(error.message || "Could not accept the invitation");
      return;
    }

    toast.success(`You're in — welcome to ${community.name}`);
    load();
  };

  const handleLeave = async () => {
    if (!community) return;

    setWorking(true);
    const { error } = await leaveCommunity(community.id);
    setWorking(false);

    if (error) {
      toast.error("Could not leave the group");
      return;
    }

    toast.success("You've left the group");
    load();
  };

  const handleDelete = async () => {
    if (!community) return;

    setDeleting(true);
    const { error } = await deleteCommunity(community.id);
    setDeleting(false);

    if (error) {
      toast.error("Could not delete the group");
      return;
    }

    toast.success(`${community.name} has been deleted`);
    navigate("/communities");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-5xl px-4 py-12">
          <Skeleton className="mb-4 h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="mb-3 text-2xl font-bold">That group doesn't exist</h1>
          <p className="mb-6 text-muted-foreground">
            It may have been removed, or the link may be wrong.
          </p>
          <Button asChild>
            <Link to="/communities">See all groups</Link>
          </Button>
        </div>
      </div>
    );
  }

  const kind = getCommunityKindMeta(community.kind);
  const pendingRequests = community.pending_request_count ?? 0;
  const showRequests =
    Boolean(community.viewer_is_owner) &&
    community.visibility === "private" &&
    (pendingRequests > 0 || cameForRequests);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${community.name} | Friendly Learning`}
        description={community.description.slice(0, 155)}
      />

      <div className="container mx-auto max-w-5xl px-4 pt-6 pb-36 md:pt-8 md:pb-48">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/communities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All groups
          </Link>
        </Button>

        {/* Header. Deliberately not a Card: it is the top of the room, not an
            object sitting inside it. One rule under it does the separating that
            a border, a radius and a shadow were doing before. */}
        <header className="mb-6 border-b pb-6">
          <div className="flex items-start gap-4">
            <CommunityAvatar
              slug={community.slug}
              kind={community.kind}
              name={community.name}
              coverImage={community.cover_image}
              className="h-16 w-16 shrink-0 md:h-20 md:w-20"
              emojiClassName="text-3xl md:text-4xl"
            />

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight md:text-3xl">{community.name}</h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  <span aria-hidden>{kind.emoji}</span> {kind.label}
                </span>
                <span aria-hidden>·</span>
                {community.visibility === "private" ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" />
                    Invite only
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                    <Globe className="h-3.5 w-3.5" />
                    Open
                  </span>
                )}
                <span aria-hidden>·</span>
                {/* Recency, not a total. "34 discussions" is a number this
                    product does not have; when it was last talked in is the
                    thing worth knowing before walking in. */}
                <span>Active {formatRelativeTime(community.last_activity_at)}</span>
                {community.is_archived && (
                  <>
                    <span aria-hidden>·</span>
                    <Badge variant="outline">Archived</Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-muted-foreground">{community.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* The member count is the door to the member list. It used to be a
                permanent 20rem column rendering three avatars. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMembersOpen(true)}
              className="gap-1.5"
            >
              <Users className="h-4 w-4" />
              {community.member_count} {community.member_count === 1 ? "member" : "members"}
            </Button>

            {community.viewer_is_owner ? (
              <>
                <Badge variant="outline" className="h-9 items-center px-3">
                  You run this group
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Manage group">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit group
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(event) => event.preventDefault()}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete group
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {community.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes the group — its posts, chat history and member
                            list all go with it. This can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleting ? "Deleting..." : "Delete group"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : community.viewer_is_member ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={working}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave {community.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll stop being able to post here. Your existing posts stay, and you can
                      rejoin whenever you like.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Stay</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : community.is_archived ? (
              <p className="text-sm text-muted-foreground">
                This group has been archived and isn't taking new members.
              </p>
            ) : community.visibility === "private" ? (
              // An invitation outranks a pending request: if the owner has
              // reached out in the meantime, offer the door rather than
              // leaving them staring at "Requested".
              community.viewer_has_invite ? (
                <Button onClick={handleAcceptInvite} disabled={working}>
                  {working ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Accept invitation
                </Button>
              ) : community.viewer_has_requested ? (
                <Button variant="outline" disabled>
                  Requested
                </Button>
              ) : (
                <Button
                  onClick={() => (user ? setRequestOpen(true) : navigate("/signin"))}
                  disabled={working}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Request to join
                </Button>
              )
            ) : (
              // handleJoin already redirects a signed-out visitor to sign-in,
              // but "Join group" promises something that will not happen on
              // this click. Say where the button actually goes.
              <Button onClick={handleJoin} disabled={working}>
                {working ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : user ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {user ? "Join group" : "Sign in to join"}
              </Button>
            )}

            {/* Shown to everyone who can see the group, not just the owner.
                A member forwarding the link to a friend is how a group grows;
                restricting that to one person is how it doesn't. Archived
                groups are excluded — there is nothing to invite anyone to. */}
            {!community.is_archived && (
              <InviteLinkButton slug={community.slug} name={community.name} />
            )}

            <span className="ml-auto text-sm text-muted-foreground">
              {/* Owners no longer have to be mentors, so /mentor/:id would be a
                  dead end for most of them. Link only when it actually resolves. */}
              Run by{" "}
              {community.owner.is_mentor ? (
                <Link
                  to={`/mentor/${community.owner.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {community.owner.name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{community.owner.name}</span>
              )}
            </span>
          </div>
        </header>

        {/* Nobody did anything wrong here, so this reads as a description of
            the group rather than a refusal. "Access denied" would be both
            unfriendly and untrue — they are one request away. */}
        {community.viewer_can_view === false ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="h-6 w-6" />
              </span>
              <p className="text-lg font-semibold">This group is invite only</p>

              {community.viewer_has_requested ? (
                <p className="max-w-sm text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Request sent.</span> You'll get a
                  notification when {community.owner.name} replies.
                </p>
              ) : (
                <>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Members can see the posts here. Ask {community.owner.name} to join and they'll
                    get a notification.
                  </p>
                  {!community.viewer_has_invite && (
                    <Button onClick={() => (user ? setRequestOpen(true) : navigate("/signin"))}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Request to join
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Join requests appear when there are join requests, rather than
                living in a permanently-visible tab that is usually empty. */}
            {showRequests && <JoinRequestsPanel communityId={community.id} onDecided={load} />}

            <CommunityGroupChat
              communityId={community.id}
              communityKind={community.kind}
              ownerName={community.owner.name}
              isMember={Boolean(community.viewer_is_member)}
              isOwner={Boolean(community.viewer_is_owner)}
              posts={posts}
              onOpenPost={(postId) => navigate(`/community-posts/${postId}`)}
              onCreatePost={community.viewer_can_post ? () => setCreateOpen(true) : undefined}
            />
          </div>
        )}
      </div>

      {/* Members, on demand. */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              Members{" "}
              <span className="font-normal text-muted-foreground">({community.member_count})</span>
            </SheetTitle>
            <SheetDescription>Everyone who has joined {community.name}.</SheetDescription>
          </SheetHeader>

          <div className="mt-4">
            <CommunityMemberList
              communityId={community.id}
              isOwner={community.viewer_is_owner}
              visibility={community.visibility}
              onChanged={load}
              variant="plain"
            />
          </div>
        </SheetContent>
      </Sheet>

      <JoinRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        communityId={community.id}
        communityName={community.name}
        ownerName={community.owner.name}
        onRequested={load}
      />

      {community.viewer_can_post && (
        <CreatePostModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          communityId={community.id}
          communityName={community.name}
          onPostCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {community.viewer_is_owner && (
        <EditCommunityModal
          open={editOpen}
          onOpenChange={setEditOpen}
          community={community}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default CommunityDetail;
