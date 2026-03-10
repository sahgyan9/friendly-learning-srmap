import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { getCommunityPosts, togglePostLike, checkUserLikedPost, type CommunityPost } from "@/integrations/supabase/services/community-posts";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { cn } from "@/lib/utils";

const POST_TYPES = [
  { value: 'hackathon', label: 'Hackathon Partners' },
  { value: 'research', label: 'Research Collaboration' },
  { value: 'problem-solving', label: 'Problem Solving' },
  { value: 'project', label: 'Project Ideas' },
  { value: 'general', label: 'General Discussion' },
];

export const CommunityPostsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitX, setExitX] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await getCommunityPosts(8);

    if (error) {
      console.error('Error fetching community posts:', error);
    } else if (data) {
      if (user) {
        const postsWithLikeStatus = await Promise.all(
          data.map(async (post) => {
            const { liked } = await checkUserLikedPost(post.id);
            return { ...post, user_has_liked: liked };
          })
        );
        setPosts(postsWithLikeStatus);
      } else {
        setPosts(data);
      }
    }
    setLoading(false);
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }
    const { error, liked } = await togglePostLike(postId);
    if (error) {
      toast.error("Failed to update like");
    } else {
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, user_has_liked: liked, likes_count: liked ? post.likes_count + 1 : post.likes_count - 1 }
          : post
      ));
    }
  };

  const handleShare = async (post: CommunityPost, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.share({ title: post.title, text: post.content, url: `${window.location.origin}/community-posts/${post.id}` });
    } catch {
      navigator.clipboard.writeText(`${window.location.origin}/community-posts/${post.id}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleConnect = async (mentorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error("Please sign in to connect"); return; }
    try {
      const { data: mentorData, error: mentorError } = await getMentorById(mentorId);
      if (mentorError || !mentorData) { toast.error("Mentor not found"); return; }
      const { data: conversation, error: conversationError } = await getOrCreateConversation(user.id, mentorId);
      if (conversationError || !conversation) { toast.error('Failed to start conversation'); return; }
      navigate(`/messages?chat=${conversation.id}`);
      toast.success(`Connected with ${mentorData.name}!`);
    } catch {
      toast.error('Failed to connect with mentor');
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      setExitX(info.offset.x);
      setTimeout(() => {
        if (info.offset.x < 0) {
          setCurrentIndex((prev) => Math.min(prev + 1, posts.length - 1));
        } else {
          setCurrentIndex((prev) => Math.max(prev - 1, 0));
        }
        setExitX(0);
      }, 200);
    }
  };

  const handleNext = () => {
    if (currentIndex >= posts.length - 1) return;
    setExitX(-200);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitX(0);
    }, 200);
  };

  const handlePrev = () => {
    if (currentIndex <= 0) return;
    setExitX(200);
    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1);
      setExitX(0);
    }, 200);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fulfilled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading || posts.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Community Posts</h2>
            <p className="text-muted-foreground">
              Connect with mentors for hackathons, research, and collaboration
            </p>
          </div>
          <Link to="/community-posts">
            <Button variant="outline" className="flex items-center gap-2">
              View All Posts
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Swipeable Card Stack */}
        <div className="relative w-full flex items-center justify-center" style={{ minHeight: 420 }}>
          {/* Navigation arrows */}
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="absolute left-2 md:left-8 z-40 h-10 w-10 rounded-full bg-background/80 border border-border hover:bg-muted flex items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex >= posts.length - 1}
            className="absolute right-2 md:right-8 z-40 h-10 w-10 rounded-full bg-background/80 border border-border hover:bg-muted flex items-center justify-center text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow"
          >
            →
          </button>

          <AnimatePresence mode="popLayout">
            {posts.map((post, index) => {
              const isCurrentCard = index === currentIndex;
              const isPrevCard = index === currentIndex + 1;
              const isNextCard = index === currentIndex + 2;

              if (!isCurrentCard && !isPrevCard && !isNextCard) return null;

              return (
                <motion.div
                  key={post.id}
                  className={cn(
                    "absolute w-[320px] md:w-[400px] rounded-2xl bg-card border border-border p-5 shadow-lg",
                    isCurrentCard && "z-30 cursor-grab active:cursor-grabbing",
                    isPrevCard && "z-20",
                    isNextCard && "z-10",
                  )}
                  initial={{
                    scale: isCurrentCard ? 1 : 0.9,
                    y: isCurrentCard ? 0 : 20,
                    opacity: isCurrentCard ? 1 : 0.6,
                  }}
                  animate={{
                    scale: isCurrentCard ? 1 : isPrevCard ? 0.95 : 0.9,
                    y: isCurrentCard ? 0 : isPrevCard ? 10 : 20,
                    x: exitX && isCurrentCard ? exitX : 0,
                    opacity: isCurrentCard ? 1 : isPrevCard ? 0.7 : 0.4,
                    rotateZ: isCurrentCard ? (exitX ? exitX * 0.03 : 0) : isPrevCard ? -2 : 2,
                  }}
                  exit={{ x: exitX, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  drag={isCurrentCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={isCurrentCard ? handleDragEnd : undefined}
                  onClick={() => isCurrentCard && navigate(`/community-posts/${post.id}`)}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                        onClick={(e) => { e.stopPropagation(); navigate(`/mentor/${post.mentor.id}`); }}
                      >
                        <AvatarImage src={post.mentor.profile_image || undefined} />
                        <AvatarFallback>{post.mentor.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4
                          className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={(e) => { e.stopPropagation(); navigate(`/mentor/${post.mentor.id}`); }}
                        >
                          {post.mentor.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{post.mentor.department}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(post.status)}`}>
                      {post.status}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-base md:text-lg mb-2 line-clamp-2">{post.title}</h3>

                  {/* Image */}
                  {post.image_url && (
                    <div className="mb-2 w-full bg-muted rounded-lg overflow-hidden">
                      <img
                        src={post.image_url}
                        alt="Post image"
                        className="w-full h-auto max-h-36 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{post.content}</p>

                  {/* Tags Row */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {POST_TYPES.find(type => type.value === post.post_type)?.label || post.post_type}
                    </Badge>
                    {post.tags?.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                    {(post.tags?.length || 0) > 2 && (
                      <span className="text-xs text-muted-foreground">+{post.tags!.length - 2} more</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => handleLike(post.id, e)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors">
                        <Heart className={`h-3.5 w-3.5 ${post.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
                        {post.likes_count}
                      </button>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {post.comments_count}
                      </div>
                      <button onClick={(e) => handleShare(post, e)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-500 transition-colors">
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      <Button size="sm" className="h-7 px-3 text-xs" onClick={(e) => handleConnect(post.mentor.id, e)}>
                        Connect
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Dots */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {posts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
