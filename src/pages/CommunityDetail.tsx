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
import { CommunityWorkspaceHeader } from "@/components/communities/CommunityWorkspaceHeader";
import { CommunityWorkspaceSidebar } from "@/components/communities/CommunityWorkspaceSidebar";
import { CommunityMemberDrawer } from "@/components/communities/CommunityMemberDrawer";
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
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);

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
        title={`${community.name} Workspace | Friendly Learning`}
        description={community.description.slice(0, 155)}
      />

      <div className="container mx-auto max-w-6xl px-4 pt-6 pb-36 md:pt-8 md:pb-48">
        {/* Workspace Hero Header */}
        <CommunityWorkspaceHeader
          community={community}
          user={user}
          working={working}
          deleting={deleting}
          onJoin={handleJoin}
          onAcceptInvite={handleAcceptInvite}
          onLeave={handleLeave}
          onDelete={handleDelete}
          onRequestJoin={() => (user ? setRequestOpen(true) : navigate("/signin"))}
          onOpenCreatePost={() => setCreateOpen(true)}
          onOpenEdit={() => setEditOpen(true)}
          onOpenMembersDrawer={() => setMembersDrawerOpen(true)}
        />

        {community.viewer_can_view === false ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="h-6 w-6" />
              </span>
              <p className="text-lg font-semibold">This workspace is invite only</p>

              {community.viewer_has_requested ? (
                <p className="max-w-sm text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Request sent.</span> You'll get a
                  notification when {community.owner.name} replies.
                </p>
              ) : (
                <>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Members can see the discussions here. Ask {community.owner.name} to join and they'll
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
          <div className="grid gap-6 md:grid-cols-[16rem_1fr] lg:grid-cols-[18rem_1fr]">
            {/* Workspace Sidebar Channels */}
            <aside>
              <CommunityWorkspaceSidebar
                community={community}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                onOpenMembersDrawer={() => setMembersDrawerOpen(true)}
              />
            </aside>

            {/* Main Canvas Area */}
            <main className="min-w-0 space-y-4">
              {activeTab === "chat" && (
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
              )}

              {activeTab === "posts" && (
                <div className="space-y-4">
                  {community.viewer_can_post && (
                    <div className="flex justify-between items-center rounded-xl border border-border/60 bg-card p-4">
                      <div>
                        <h3 className="font-semibold text-sm">Post in #{community.name}</h3>
                        <p className="text-xs text-muted-foreground">Share project updates, resources, or code snippets with group members.</p>
                      </div>
                      <Button onClick={() => setCreateOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New post
                      </Button>
                    </div>
                  )}

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
                </div>
              )}

              {activeTab === "requests" && community.viewer_is_owner && community.visibility === "private" && (
                <JoinRequestsPanel communityId={community.id} onDecided={load} />
              )}
            </main>
          </div>
        )}
      </div>

      <CommunityMemberDrawer
        open={membersDrawerOpen}
        onOpenChange={setMembersDrawerOpen}
        communityId={community.id}
        communityName={community.name}
        isOwner={community.viewer_is_owner}
        visibility={community.visibility}
        onChanged={load}
      />

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
