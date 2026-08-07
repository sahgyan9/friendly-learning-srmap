import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CreatePostButton } from "@/components/community/CreatePostButton";
import { PostComposerStrip } from "@/components/community/PostComposerStrip";
import { PostCard } from "@/components/community/PostCard";
import { useAuth } from "@/context/AuthContext";
import {
  getCommunityPosts,
  togglePostLike,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

import { ImageLightbox } from "@/components/community/ImageLightbox";
import { getPostImageUrls } from "@/integrations/supabase/services/community-posts";

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

  // Tighter at the top than the sections below it: this one sits directly under
  // the hero and the fold runs through it, so its padding is competing with the
  // post cards it exists to introduce.
  return (
    <section className="bg-muted/30 pt-8 pb-16">
      <div className="container mx-auto px-4">
        {/* No section header here — not a pill, not a heading. This is the top
            of the page, and the composer strip plus the first row of cards say
            "this is a student board" faster than any label describing them can.
            The "POSTS" pill in particular was labelling the one section on the
            page that needs no introduction, and once the left rail carries the
            navigation it is also naming a place you can already see you are in.
            Restore a heading here only if the feed stops being the first thing
            on the page. */}
        <PostComposerStrip onPostCreated={reload} />

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
              {/* `items-stretch` gives every card the height of the tallest,
                  so the rail reads as one row rather than a ragged skyline.
                  This replaced `items-start`, which avoided stretching
                  text-only cards into empty space — PostCard now solves that
                  properly by letting a card with no image spend the height on
                  more of its own text. `w-max mx-auto` centres the rail while
                  it still fits and lets it scroll once it doesn't. */}
              <div className="mx-auto flex w-max snap-x snap-mandatory items-stretch gap-4">
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
                    onImageClick={(src, title, index, allImages) => {
                      const urls = allImages && allImages.length > 0 ? allImages : getPostImageUrls(post.image_url);
                      setLightbox({
                        images: urls,
                        title: title || post.title,
                        index: index ?? 0,
                      });
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

      <ImageLightbox
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        title={lightbox?.title}
        onClose={() => setLightbox(null)}
      />
    </section>
  );
};

export default CommunityPostsSection;
