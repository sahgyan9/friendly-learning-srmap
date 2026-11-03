import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Flame, MessageSquare, PenLine, Users, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community-posts/PostCard";
import { PostComposerStrip } from "@/components/community-posts/PostComposerStrip";
import { CreatePostButton } from "@/components/community-posts/CreatePostButton";
import { ImageLightbox } from "@/components/community-posts/ImageLightbox";
import { useAuth } from "@/context/AuthContext";
import { useOfflineCachedList } from "@/hooks/useOfflineCachedList";
import {
  getCommunityPosts,
  togglePostLike,
  getPostImageUrls,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

const FILTER_TABS = [
  { id: "all", label: "All posts", icon: Flame },
  { id: "hackathon", label: "Hackathons and teams", icon: Users },
  { id: "study", label: "Study and courses", icon: BookOpen },
  { id: "general", label: "Discussions", icon: MessageSquare },
] as const;

type FilterTabId = (typeof FILTER_TABS)[number]["id"];

export const CampusFeedWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchPosts = useCallback(() => getCommunityPosts({ limit: 12 }), []);
  const {
    items: posts,
    setItems: setPosts,
    loading,
    refetch: reload,
  } = useOfflineCachedList<CommunityPost>({
    cacheKey: "campus_feed_posts",
    fetcher: fetchPosts,
  });
  const [activeTab, setActiveTab] = useState<FilterTabId>("all");
  const [lightbox, setLightbox] = useState<{ images: string[]; title?: string; index: number } | null>(null);

  const handleLike = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }

    const { error, liked } = await togglePostLike(postId);
    if (error) {
      toast.error("Failed to update like");
      return;
    }

    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? {
              ...post,
              viewer_has_liked: liked,
              likes_count: Math.max(0, post.likes_count + (liked ? 1 : -1)),
            }
          : post,
      ),
    );
  };

  const handleShare = async (post: CommunityPost, event: React.MouseEvent) => {
    event.stopPropagation();
    const url = `${window.location.origin}/posts#post-${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch {
        // Share sheet dismissed — fall through to clipboard.
      }
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  // Filter posts based on active tab
  const filteredPosts = posts.filter((p) => {
    if (activeTab === "all") return true;
    if (activeTab === "hackathon") return p.post_type === "hackathon" || p.post_type === "project";
    if (activeTab === "study") return p.post_type === "question" || p.post_type === "resource";
    if (activeTab === "general") return p.post_type === "general" || p.post_type === "discussion";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div role="tablist" aria-label="Filter posts" className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feed Area */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/5" />
                </div>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
            <PenLine className="h-5 w-5" aria-hidden />
          </div>
          <h3 className="mb-1 text-base font-medium">No posts in this category yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Start one and it will show up here.
          </p>
          <div className="flex justify-center">
            <CreatePostButton onPostCreated={reload} />
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPosts.slice(0, 6).map((post) => (
            <div key={post.id}>
              <PostCard
                post={post}
                variant="full"
                className="w-full"
                onOpen={(postId) => navigate(`/posts#post-${postId}`)}
                onLike={handleLike}
                onShare={handleShare}
                onComment={(postId, event) => {
                  event.stopPropagation();
                  navigate(`/posts#post-${postId}`);
                }}
                onImageClick={(src, title, index, allImages) => {
                  const urls = allImages && allImages.length > 0 ? allImages : getPostImageUrls(post.image_url);
                  setLightbox({
                    images: urls,
                    title: title || post.title,
                    index: index ?? 0,
                  });
                }}
              />
            </div>
          ))}

          {/* View All Posts Footer Link */}
          <div className="pt-2 flex justify-center">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/posts">
                View all posts
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        title={lightbox?.title}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
};
