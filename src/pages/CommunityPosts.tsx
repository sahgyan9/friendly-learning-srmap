import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, Search } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import StructuredData from "@/components/StructuredData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePostButton } from "@/components/community/CreatePostButton";
import { InlineComments } from "@/components/community/InlineComments";
import { PostCard } from "@/components/community/PostCard";
import { ImageLightbox } from "@/components/community/ImageLightbox";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  POST_TYPES,
  getCommunityPosts,
  getPostTypeCounts,
  togglePostLike,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

const PAGE_SIZE = 20;

const CommunityPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [mine, setMine] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  const selectedType = searchParams.get("type") ?? "all";
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // The feed is filtered and paginated in Postgres now, so the client no longer
  // pulls every post and filters in memory.
  const loadPosts = useCallback(
    async (offset = 0) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { data, total: matched, error } = await getCommunityPosts({
        postType: selectedType,
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset,
        mine,
      });

      if (error) {
        toast.error("Failed to load community posts");
      } else if (data) {
        setPosts((previous) => (offset === 0 ? data : [...previous, ...data]));
        setTotal(matched);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [selectedType, debouncedSearch, mine],
  );

  // Signing out with "Only mine" still pressed would ask the server for the
  // posts of nobody, and show an empty board with no explanation.
  useEffect(() => {
    if (!user) setMine(false);
  }, [user]);

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  // Read once on mount rather than after every filter change: the counts are
  // for the whole board and do not depend on what is currently selected.
  useEffect(() => {
    getPostTypeCounts().then(setTypeCounts);
  }, []);

  /**
   * Which chips to show. A category earns its place by having posts in it.
   *
   * Two exceptions, both about not stranding anyone. "All posts" is always
   * there because it is the way back. And whatever is currently selected stays
   * visible even at zero, because arriving on ?type=research and finding no
   * chip pressed would read as a broken page rather than an empty category.
   *
   * When counts are unknown — the RPC failed, or nothing has loaded yet —
   * everything shows, which is exactly the behaviour that existed before.
   */
  const { visibleTypes, hiddenTypes } = useMemo(() => {
    const known = Object.keys(typeCounts).length > 0;
    if (!known || showAllTypes) return { visibleTypes: [...POST_TYPES], hiddenTypes: [] };

    const visible = POST_TYPES.filter(
      (type) =>
        type.value === "all" || type.value === selectedType || (typeCounts[type.value] ?? 0) > 0,
    );

    return {
      visibleTypes: visible,
      hiddenTypes: POST_TYPES.filter((type) => !visible.includes(type)),
    };
  }, [typeCounts, showAllTypes, selectedType]);

  // Keep the filter in the URL so a filtered feed can be linked and the back
  // button behaves.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("q", debouncedSearch);
    else next.delete("q");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const selectType = (type: string) => {
    const next = new URLSearchParams(searchParams);
    if (type === "all") next.delete("type");
    else next.set("type", type);
    setSearchParams(next);
  };

  const handleLike = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }

    // Optimistic — reverted below if the write fails.
    const applyLike = (liked: boolean) =>
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

    const wasLiked = posts.find((post) => post.id === postId)?.viewer_has_liked ?? false;
    applyLike(!wasLiked);

    const { error, liked } = await togglePostLike(postId);
    if (error) {
      applyLike(wasLiked);
      toast.error("Failed to update like");
    } else if (liked !== !wasLiked) {
      applyLike(liked);
    }
  };

  const handleShare = async (post: CommunityPost, event: React.MouseEvent) => {
    event.stopPropagation();
    const url = `${window.location.origin}/community-posts/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.content, url });
        return;
      } catch {
        // User dismissed the share sheet, or it is unavailable — fall through.
      }
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const toggleComments = (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedComments((previous) => {
      const next = new Set(previous);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const canonical = `${PRIMARY_DOMAIN}/community-posts`;

  return (
    <>
      <SEOHead
        title={ROUTE_META["/community-posts"].title}
        description={ROUTE_META["/community-posts"].description}
        keywords="find hackathon partners srm ap, study help srmap, student project collaboration, srm ap posts"
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Posts", url: canonical },
        ])}
      />


      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 py-6">
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Posts</h1>
              <p className="text-muted-foreground">
                Find hackathon teammates, study help and project partners — anyone can post.
              </p>
            </div>
            <CreatePostButton onPostCreated={() => loadPosts(0)} />
          </header>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search posts, tags or content..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
              aria-label="Search community posts"
            />
          </div>

          {/* Chips beat a <select>: every category stays one tap away. They
              scroll on a phone and wrap on a desktop, where a scrolling strip
              would just clip the last category out of sight.

              Only the categories that hold something are shown. All eight, at
              equal weight, was eight decisions asked of someone who came to
              read two posts — and most of them led to an empty page you could
              only find by tapping. The rest are one "More" away, and the count
              on each chip means you know what you are getting before you
              choose. */}
          <div className="mb-6 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {visibleTypes.map((type) => {
                const count = typeCounts[type.value];

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => selectType(type.value)}
                    aria-pressed={selectedType === type.value}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      selectedType === type.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    <span aria-hidden>{type.emoji}</span>
                    {type.label}
                    {type.value !== "all" && count > 0 && (
                      <span
                        className={cn(
                          "tabular-nums",
                          selectedType === type.value
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {hiddenTypes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllTypes((value) => !value)}
                  aria-expanded={showAllTypes}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  {showAllTypes ? "Fewer" : `More (${hiddenTypes.length})`}
                  <ChevronDown
                    aria-hidden
                    className={cn("h-3.5 w-3.5 transition-transform", showAllTypes && "rotate-180")}
                  />
                </button>
              )}

              {/* Same filter Groups has. Signed-in only, because for everyone
                  else it is a control that can only ever return nothing. */}
              {user && (
                <button
                  type="button"
                  onClick={() => setMine((value) => !value)}
                  aria-pressed={mine}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors sm:ml-auto",
                    mine
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  Only mine
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <Card key={index}>
                  <CardHeader className="flex-row items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-dashed px-6 py-16 text-center">
              {mine ? (
                <>
                  <h3 className="mb-1 text-lg font-semibold">You haven't posted yet</h3>
                  <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">
                    Ask for a hackathon teammate, study help or a project partner — it takes a
                    minute, and it is the fastest way to be found.
                  </p>
                  <Button variant="outline" onClick={() => setMine(false)}>
                    Show all posts
                  </Button>
                </>
              ) : searchTerm || selectedType !== "all" ? (
                <>
                  <h3 className="mb-1 text-lg font-semibold">Nothing here yet</h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Try a different search or category.
                  </p>
                </>
              ) : user ? (
                <>
                  <h3 className="mb-1 text-lg font-semibold">Nothing here yet</h3>
                  <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                    Be the first to post — ask for a hackathon teammate, study help or share an
                    announcement.
                  </p>
                </>
              ) : (
                /* Mirrors the Groups empty state: say what signing in unlocks
                   rather than describing an action they cannot take. */
                <>
                  <h3 className="mb-1 text-lg font-semibold">Nothing here yet</h3>
                  <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">
                    Sign in and you can post the first one — a hackathon teammate, study help, or a
                    project partner.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/signin">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id}>
                  <PostCard
                    post={post}
                    onOpen={(postId) => navigate(`/community-posts/${postId}`)}
                    onLike={handleLike}
                    onShare={handleShare}
                    onComment={toggleComments}
                    onAuthorClick={(authorId, event) => {
                      event.stopPropagation();
                      if (post.author.is_mentor) navigate(`/mentor/${authorId}`);
                    }}
                    onImageClick={(src, title) => setLightbox({ src, title })}
                  />

                  {expandedComments.has(post.id) && (
                    <div className="mt-2 rounded-lg border bg-card p-4">
                      <InlineComments
                        postId={post.id}
                        onCommentAdded={() =>
                          setPosts((previous) =>
                            previous.map((item) =>
                              item.id === post.id
                                ? { ...item, comments_count: item.comments_count + 1 }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              ))}

              {posts.length < total && (
                <div className="pt-2 text-center">
                  <Button
                    variant="outline"
                    onClick={() => loadPosts(posts.length)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : `Load more (${total - posts.length} left)`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ImageLightbox
        src={lightbox?.src ?? null}
        title={lightbox?.title}
        onClose={() => setLightbox(null)}
      />
    </>
  );
};

export default CommunityPosts;
