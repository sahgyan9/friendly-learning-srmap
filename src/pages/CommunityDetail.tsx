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

import { PRIMARY_DOMAIN } from "@/lib/constants";
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
import { CommunityResourcesTab } from "@/components/communities/CommunityResourcesTab";
import { EditCommunityModal } from "@/components/communities/EditCommunityModal";
import { CommunityWorkspaceHeader } from "@/components/communities/CommunityWorkspaceHeader";
import { CommunityWorkspaceSidebar, channelTabId } from "@/components/communities/CommunityWorkspaceSidebar";
import { CommunityMemberDrawer } from "@/components/communities/CommunityMemberDrawer";
import CreateChannelModal from "@/components/communities/CreateChannelModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
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
import {
  listCommunityChannels,
  deleteCommunityChannel,
  type CommunityChannel,
} from "@/integrations/supabase/services/community-channels";

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
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [working, setWorking] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [channelPendingDelete, setChannelPendingDelete] = useState<CommunityChannel | null>(null);
  const [deletingChannel, setDeletingChannel] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);

  const loadPosts = useCallback(async (communityId: string) => {
    const { data } = await getCommunityPosts({ communityId, limit: 50 });
    setPosts(data ?? []);
  }, []);

  // list_community_channels is granted to `authenticated` only, so for a
  // signed-out visitor this is a request that can only come back 401. Skipping
  // it keeps the console clean and matches what they can actually do with the
  // answer: the chat itself is unreadable to them either way.
  const loadChannels = useCallback(
    async (communityId: string) => {
      if (!user) {
        setChannels([]);
        return;
      }
      const { data } = await listCommunityChannels(communityId);
      setChannels(data ?? []);
    },
    [user],
  );

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
      await Promise.all([loadPosts(data.id), loadChannels(data.id)]);
    } else {
      setPosts([]);
      setChannels([]);
    }

    setLoading(false);
  }, [slug, loadPosts, loadChannels]);

  useEffect(() => {
    load();
  }, [load]);

  // New and removed channels reach everyone already in the group without a
  // refresh. payload.old on this table is PK-only, so this re-reads the list
  // rather than trying to patch state from the row.
  useRealtimeSubscription(
    "community_channels",
    () => {
      if (community) loadChannels(community.id);
    },
    { column: "community_id", value: community?.id ?? "" },
  );

  // A tab can name a channel that is not there: a stale ?tab= link, or one the
  // owner removed while this page was open. Falling back to the built-in room
  // beats rendering an empty room with no way back to the conversation.
  useEffect(() => {
    if (loading || !activeTab.startsWith("channel:")) return;
    const slug = activeTab.slice("channel:".length);
    if (!channels.some((channel) => channel.slug === slug)) {
      setActiveTab("chat");
    }
  }, [loading, activeTab, channels]);

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
    navigate("/workspace-groups");
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
            <Link to="/workspace-groups">See all groups</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Removing a channel destroys every message in it, and nothing anywhere can
  // bring those back — so the trash icon opens a confirmation that states the
  // count rather than acting on the click. The count comes from the same RPC
  // that lists the channels, so the number in the dialog is the real one.
  const handleConfirmDeleteChannel = async () => {
    const channel = channelPendingDelete;
    if (!channel) return;

    setDeletingChannel(true);
    const { data: removed, error } = await deleteCommunityChannel(channel.id);
    setDeletingChannel(false);

    if (error) {
      toast.error(error.message || `Could not remove #${channel.slug}`);
      return;
    }

    setChannelPendingDelete(null);
    toast.success(`#${channel.slug} removed`, {
      description:
        removed && removed > 0
          ? `${removed} message${removed === 1 ? "" : "s"} went with it.`
          : undefined,
    });

    if (activeTab === channelTabId(channel.slug)) {
      setActiveTab("chat");
    }
    if (community) loadChannels(community.id);
  };

  const kind = getCommunityKindMeta(community.kind);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${community.name} Workspace Group | Friendly Learning SRMAP`}
        description={community.description.slice(0, 155)}
        canonical={`${PRIMARY_DOMAIN}/workspace-groups/${community.slug}`}
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
                channels={channels}
                canManageChannels={Boolean(community.viewer_is_owner)}
                onCreateChannel={() => setCreateChannelOpen(true)}
                onDeleteChannel={setChannelPendingDelete}
              />
            </aside>

            {/* Main Canvas Area */}
            <main className="min-w-0 space-y-4">
              {(activeTab === "chat" || activeTab.startsWith("channel:")) && (
                <CommunityGroupChat
                  communityId={community.id}
                  communityKind={community.kind}
                  ownerName={community.owner.name}
                  isMember={Boolean(community.viewer_is_member)}
                  isOwner={Boolean(community.viewer_is_owner)}
                  posts={posts}
                  onOpenPost={(postId) => navigate(`/posts/${postId}`)}
                  onCreatePost={community.viewer_can_post ? () => setCreateOpen(true) : undefined}
                  channel={activeTab.startsWith("channel:") ? activeTab.replace("channel:", "") : undefined}
                  channelTopic={
                    activeTab.startsWith("channel:")
                      ? channels.find((c) => c.slug === activeTab.replace("channel:", ""))?.topic
                      : undefined
                  }
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
                        onOpen={(postId) => navigate(`/posts/${postId}`)}
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

              {activeTab === "resources" && (
                <CommunityResourcesTab
                  communityId={community.id}
                  communityName={community.name}
                  communityKind={community.kind}
                  isMember={Boolean(community.viewer_is_member)}
                  isOwner={Boolean(community.viewer_is_owner)}
                  viewerName={user?.user_metadata?.full_name || user?.email?.split("@")[0] || "A student"}
                />
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

      <AlertDialog
        open={Boolean(channelPendingDelete)}
        onOpenChange={(next) => {
          if (!next && !deletingChannel) setChannelPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove #{channelPendingDelete?.slug}?</AlertDialogTitle>
            <AlertDialogDescription>
              {channelPendingDelete?.messageCount
                ? `The ${channelPendingDelete.messageCount} message${
                    channelPendingDelete.messageCount === 1 ? "" : "s"
                  } in this channel will be deleted for everyone. This cannot be undone.`
                : "This channel is empty, so nothing is lost. You can add it again later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingChannel}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // The dialog closes itself on action; this keeps it open until
                // the delete has actually come back, so a failure is visible.
                event.preventDefault();
                handleConfirmDeleteChannel();
              }}
              disabled={deletingChannel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingChannel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {community.viewer_is_owner && (
        <CreateChannelModal
          open={createChannelOpen}
          onOpenChange={setCreateChannelOpen}
          communityId={community.id}
          channelCount={channels.length}
          onCreated={async (newSlug) => {
            // Reload first, then switch. The other way round leaves a moment
            // where the tab names a channel the list has not caught up with,
            // and the stale-tab guard above would bounce it back to #general.
            await loadChannels(community.id);
            setActiveTab(channelTabId(newSlug));
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
