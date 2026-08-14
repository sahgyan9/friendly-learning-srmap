import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, PenLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

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

  useEffect(() => {
    if (!scrollContainerRef.current || posts.length === 0) return;
    const container = scrollContainerRef.current;

    const handleScroll = () => {
      const cards = Array.from(container.querySelectorAll<HTMLDivElement>("[data-post-card]"));
      if (cards.length === 0) return;

      // When scrolled near or to the right edge, activate the last card
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 60;
      if (isAtEnd) {
        setActiveIndex(cards.length - 1);
        return;
      }

      // When at or near the left edge, activate the first card
      const isAtStart = container.scrollLeft <= 30;
      if (isAtStart) {
        setActiveIndex(0);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const targetFocusX = containerRect.left + containerRect.width / 2;

      let closestIdx = 0;
      let minDistance = Infinity;

      cards.forEach((card, idx) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenter - targetFocusX);
        if (distance < minDistance) {
          minDistance = distance;
          closestIdx = idx;
        }
      });

      setActiveIndex(closestIdx);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [posts]);

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

  // Tighter at the top than the sections below it: this one sits directly under
  // the hero and the fold runs through it, so its padding is competing with the
  // post cards it exists to introduce.
  return (
    <section className="bg-muted/30 pt-4 pb-16">
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

        {loading ? (
          // Returning null here used to skip this whole section during SSR: the
          // posts fetch runs in an effect, which never fires during prerendering,
          // so `loading` was still true at render time and this section vanished
          // from the static homepage entirely. HomeIntro became the first thing
          // painted, then the real feed popped in above it once the client fetch
          // resolved on hydration — a full-section layout jump on every load. A
          // same-shaped skeleton keeps the slot occupied instead.
          <div className="-mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
            <div className="mx-auto flex w-max items-stretch gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[280px] w-[400px] shrink-0 animate-pulse rounded-xl border border-border bg-card md:w-[460px]"
                />
              ))}
            </div>
          </div>
        ) : posts.length === 0 ? (
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
            <HorizontalScroller
              scrollRef={scrollContainerRef}
              className="-mx-4 px-4 pb-4 [scrollbar-width:thin]"
              hideScrollbar={false}
              fadeFrom="from-muted/30"
              edgeWidth="w-16"
              arrowSize="md"
              scrollAmount={416}
              ariaLabel="Recent community posts"
            >
              {/* `items-stretch` gives every card the height of the tallest,
                  so the rail reads as one row rather than a ragged skyline.
                  This replaced `items-start`, which avoided stretching
                  text-only cards into empty space — PostCard now solves that
                  properly by letting a card with no image spend the height on
                  more of its own text. `w-max mx-auto` centres the rail while
                  it still fits and lets it scroll once it doesn't. */}
              <div className="mx-auto flex w-max snap-x snap-mandatory items-stretch gap-4">
                {posts.map((post, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <div
                      key={post.id}
                      data-post-card
                      data-post-id={post.id}
                      className={`shrink-0 snap-start w-[400px] md:w-[460px] transition-all duration-500 ease-out ${
                        isActive
                          ? "opacity-100 blur-none scale-100 z-10"
                          : "opacity-40 blur-[3px] scale-[0.97] hover:opacity-100 hover:blur-none hover:scale-100 focus-within:opacity-100 focus-within:blur-none"
                      }`}
                    >
                      <PostCard
                        post={post}
                        variant="compact"
                        className="w-full h-full"
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
                  );
                })}
              </div>
            </HorizontalScroller>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <CreatePostButton onPostCreated={reload} />
              <Button asChild variant="outline" className="gap-2">
                <Link to="/posts">
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
