import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Flame, MessageSquare, PenLine, Sparkles, Users, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/PostCard";
import { PostComposerStrip } from "@/components/community/PostComposerStrip";
import { CreatePostButton } from "@/components/community/CreatePostButton";
import { ImageLightbox } from "@/components/community/ImageLightbox";
import { useAuth } from "@/context/AuthContext";
import {
  getCommunityPosts,
  togglePostLike,
  getPostImageUrls,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

const FILTER_TABS = [
  { id: "all", label: "🔥 All Posts", icon: Flame },
  { id: "hackathon", label: "🚀 Hackathons & Teams", icon: Users },
  { id: "study", label: "📚 Study & Courses", icon: BookOpen },
  { id: "general", label: "💬 Discussions", icon: MessageSquare },
] as const;

type FilterTabId = (typeof FILTER_TABS)[number]["id"];

export const CampusFeedWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTabId>("all");
  const [lightbox, setLightbox] = useState<{ images: string[]; title?: string; index: number } | null>(null);

  const reload = useCallback(async () => {
    const { data } = await getCommunityPosts({ limit: 12 });
    if (data) setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCommunityPosts({ limit: 12 }).then(({ data }) => {
      if (cancelled) return;
      if (data) setPosts(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      {/* Top Composer Strip */}
      <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
        <PostComposerStrip onPostCreated={reload} />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {FILTER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground"
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
            <div
              key={i}
              className="h-44 w-full animate-pulse rounded-xl border border-border/70 bg-card"
            />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center p-6">
          <PenLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <h3 className="mb-1 font-semibold text-base">No posts in this category yet</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Share what's on your mind or start a new discussion.
          </p>
          <div className="flex justify-center">
            <CreatePostButton onPostCreated={reload} />
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredPosts.slice(0, 6).map((post) => (
            <div key={post.id} className="transition-transform duration-200">
              <PostCard
                post={post}
                variant="full"
                className="w-full shadow-xs hover:shadow-md transition-shadow"
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
            <Button asChild variant="outline" className="w-full sm:w-auto gap-2 text-xs h-9">
              <Link to="/posts">
                View all campus discussions & posts
                <ArrowRight className="h-3.5 w-3.5" />
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
