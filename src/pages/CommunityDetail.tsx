import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Globe,
  Hash,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
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
import { PostCard } from "@/components/community/PostCard";
import { CreatePostModal } from "@/components/community/CreatePostModal";
import { CommunityMemberList } from "@/components/communities/CommunityMemberList";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { InviteLinkButton } from "@/components/communities/InviteLinkButton";
import JoinRequestDialog from "@/components/communities/JoinRequestDialog";
import JoinRequestsPanel from "@/components/communities/JoinRequestsPanel";
import { CommunityGroupChat } from "@/components/communities/CommunityGroupChat";
import { EditCommunityModal } from "@/components/communities/EditCommunityModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
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
  togglePostLike,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

const CommunityDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "chat");

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleLike = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      navigate("/signin");
      return;
    }

    // Optimistic: the count moves under the finger, and reverts if the write fails.
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              viewer_has_liked: !post.viewer_has_liked,
              likes_count: post.likes_count + (post.viewer_has_liked ? -1 : 1),
            }
          : post,
      ),
    );

    const { error } = await togglePostLike(postId);
    if (error && community) loadPosts(community.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-12">
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${community.name} | Friendly Learning`}
        description={community.description.slice(0, 155)}
      />

      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-36 md:pt-8 md:pb-48">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/communities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All groups
          </Link>
        </Button>

        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-start gap-4">
              <CommunityAvatar
                slug={community.slug}
                kind={community.kind}
                name={community.name}
                coverImage={community.cover_image}
                className="h-14 w-14 md:h-16 md:w-16"
                emojiClassName="text-2xl md:text-3xl"
              />

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <span aria-hidden>{kind.emoji}</span>
                    {kind.label}
                  </Badge>
                  {community.visibility === "private" ? (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Invite only
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-green-500/30 text-green-700 dark:text-green-400"
                    >
                      <Globe className="h-3 w-3" />
                      Open group
                    </Badge>
                  )}
                  {community.is_archived && <Badge variant="outline">Archived</Badge>}
                </div>

                <h1 className="text-2xl font-bold md:text-3xl">{community.name}</h1>
              </div>
            </div>

            <p className="whitespace-pre-line text-muted-foreground">{community.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {community.member_count} {community.member_count === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {community.post_count} {community.post_count === 1 ? "post" : "posts"}
              </span>
              {/* Owners no longer have to be mentors, so /mentor/:id would be a
                  dead end for most of them. Link only when it actually resolves. */}
              <span>
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

            <div className="flex flex-wrap gap-2 border-t pt-4">
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

              {community.viewer_can_post && (
                <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Post in this group
                </Button>
              )}

              {/* Shown to everyone who can see the group, not just the owner.
                  A member forwarding the link to a friend is how a group grows;
                  restricting that to one person is how it doesn't. Archived
                  groups are excluded — there is nothing to invite anyone to. */}
              {!community.is_archived && (
                <InviteLinkButton slug={community.slug} name={community.name} />
              )}
            </div>
          </CardContent>
        </Card>

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
                    <Button
                      onClick={() => (user ? setRequestOpen(true) : navigate("/signin"))}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Request to join
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* bg-muted sits at 96% lightness against a 100% white card, so the
                  pill was nearly invisible in light mode and the inactive tab read
                  as plain text rather than a second clickable control. A visible
                  border plus stronger inactive-text contrast fixes both. */}
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1 border bg-muted/70 p-1 shadow-sm">
                <TabsTrigger
                  value="posts"
                  className="gap-2 data-[state=inactive]:text-foreground/75"
                >
                  <MessageSquare className="h-4 w-4" />
                  Posts & Discussions
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="gap-2 data-[state=inactive]:text-foreground/75"
                >
                  <Hash className="h-4 w-4" />
                  Group Chat
                </TabsTrigger>
                {community.viewer_is_owner && community.visibility === "private" && (
                  <TabsTrigger
                    value="requests"
                    className="gap-2 data-[state=inactive]:text-foreground/75"
                  >
                    Requests
                    {(community.pending_request_count ?? 0) > 0 && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                        {community.pending_request_count}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="posts" className="space-y-4">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onOpen={(postId) => navigate(`/community-posts/${postId}`)}
                      onLike={handleLike}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageSquare className="h-6 w-6" />
                      </span>
                      <p className="font-medium">Nothing posted here yet</p>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        {community.viewer_can_post
                          ? "You're a member — say what the group is working on and get it started."
                          : "Join the group to post here."}
                      </p>
                      {community.viewer_can_post && (
                        <Button onClick={() => setCreateOpen(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Write the first post
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="chat" className="space-y-4">
                <CommunityGroupChat
                  communityId={community.id}
                  communitySlug={community.slug}
                  communityKind={community.kind}
                  communityName={community.name}
                  communityCoverImage={community.cover_image}
                  ownerName={community.owner.name}
                  isMember={Boolean(community.viewer_is_member)}
                  isOwner={Boolean(community.viewer_is_owner)}
                />
              </TabsContent>

              {community.viewer_is_owner && community.visibility === "private" && (
                <TabsContent value="requests">
                  <JoinRequestsPanel communityId={community.id} onDecided={load} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          <CommunityMemberList
            communityId={community.id}
            isOwner={community.viewer_is_owner}
            visibility={community.visibility}
            onChanged={load}
          />
        </div>
        )}
      </div>

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
