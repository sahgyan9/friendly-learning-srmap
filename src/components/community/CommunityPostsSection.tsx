import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CreatePostButton } from "@/components/community/CreatePostButton";
import { PostCard } from "@/components/community/PostCard";
import { useAuth } from "@/context/AuthContext";
import {
  getCommunityPosts,
  togglePostLike,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

/**
 * Homepage rail of recent community posts.
 *
 * A horizontally snapping rail replaced the previous drag-to-dismiss card
 * stack: it shows several posts at once instead of one, swipes natively on
 * touch devices, and needs no drag-gesture bookkeeping.
 */
export const CommunityPostsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await getCommunityPosts({ limit: 8 });
    if (data) setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCommunityPosts({ limit: 8 }).then(({ data }) => {
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
    const url = `${window.location.origin}/community-posts/${post.id}`;

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

  if (loading) return null;

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        {/* Centred to match the rhythm of every other homepage section. */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-3xl font-bold">Posts</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Looking for a hackathon teammate, study help or a project partner? Ask here.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <PenLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="mb-1 font-semibold">No posts yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Be the first to post — every student can.
            </p>
            <div className="flex justify-center">
              <CreatePostButton onPostCreated={reload} />
            </div>
          </div>
        ) : (
          <>
            <div className="-mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
              {/* `items-start` stops a card with an image stretching its
                  neighbours into a column of empty space; `w-max mx-auto`
                  centres the rail while it still fits and lets it scroll once
                  it doesn't. */}
              <div className="mx-auto flex w-max snap-x snap-mandatory items-start gap-4">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    variant="compact"
                    className="w-[300px] shrink-0 snap-start md:w-[340px]"
                    onOpen={(postId) => navigate(`/community-posts/${postId}`)}
                    onLike={handleLike}
                    onShare={handleShare}
                    onComment={(postId, event) => {
                      event.stopPropagation();
                      navigate(`/community-posts/${postId}`);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CreatePostButton onPostCreated={reload} />
              <Button asChild variant="outline" className="gap-2">
                <Link to="/community-posts">
                  Browse posts
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CommunityPostsSection;
