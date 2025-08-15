import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getCommunityPosts, togglePostLike, checkUserLikedPost, type CommunityPost } from "@/integrations/supabase/services/community-posts";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		fetchPosts();
	}, []);

	const fetchPosts = async () => {
		setLoading(true);
		const { data, error } = await getCommunityPosts(8); // latest 8
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

	const handleLike = async (postId: string, e?: React.MouseEvent) => {
		e?.stopPropagation();
		if (!user) {
			toast.error("Please sign in to like posts");
			return;
		}

		const { error, liked } = await togglePostLike(postId);
		if (error) {
			toast.error("Failed to update like");
			console.error(error);
		} else {
			setPosts(posts.map(post =>
				post.id === postId
					? {
						...post,
						user_has_liked: liked,
						likes_count: liked ? post.likes_count + 1 : post.likes_count - 1
					}
					: post
			));
		}
	};

	const handleMentorClick = (mentorId: string, event?: React.MouseEvent) => {
		event?.stopPropagation();
		navigate(`/mentors/${mentorId}`);
	};

	const scroll = (direction: 'left' | 'right') => {
		const container = containerRef.current;
		if (container) {
			const cardWidth = Math.min(window.innerWidth - 64, 420);
			const gap = 16;
			const scrollAmount = (cardWidth + gap) * 1; // scroll one card
			const newPosition = direction === 'left'
				? Math.max(0, container.scrollLeft - scrollAmount)
				: Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
			container.scrollTo({ left: newPosition, behavior: 'smooth' });
		}
	};

	// Fade-in on scroll for each card
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach(entry => {
					const id = entry.target.getAttribute('data-post-id');
					if (!id) return;
					setVisibleIds(prev => {
						const next = new Set(prev);
						if (entry.isIntersecting) next.add(id);
						return next;
					});
				});
			},
			{ root: container, threshold: 0.2 }
		);

		const cards = container.querySelectorAll('.community-card');
		cards.forEach(card => observer.observe(card));

		return () => observer.disconnect();
	}, [posts]);

	if (loading || posts.length === 0) return null;

	return (
		<section className="py-16">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-3xl font-extrabold">Community Posts</h2>
						<p className="text-muted-foreground max-w-prose">Find collaborators, ask questions, and showcase project ideas from our community.</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="hidden md:flex gap-2">
							<Button variant="outline" size="sm" onClick={() => scroll('left')} aria-label="Scroll left">
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button variant="outline" size="sm" onClick={() => scroll('right')} aria-label="Scroll right">
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
						<Link to="/community-posts">
							<Button className="flex items-center gap-2">
								View All Posts
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
				</div>

				{/* Responsive layout: horizontal snap on mobile, grid on md+ */}
				<div className="relative">
					<div
						ref={containerRef}
						className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible"
						style={{ WebkitOverflowScrolling: 'touch' }}
					>
						{posts.map(post => {
							const visible = visibleIds.has(post.id);
							return (
								<article
									key={post.id}
									data-post-id={post.id}
									className={`community-card flex-shrink-0 w-[85vw] sm:w-[60vw] md:w-auto md:col-auto md:row-auto transition-transform duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
									style={{ scrollSnapAlign: 'center' }}
								>
									<Card
										className="group overflow-hidden rounded-xl shadow-xl hover:shadow-2xl transform-gpu hover:scale-[1.02] border-0"
										onClick={() => navigate(`/community-posts/${post.id}`)}
									>
										{/* Image / Hero */}
										<div className="relative h-44 md:h-48 bg-gradient-to-tr from-slate-100 to-white">
											{post.image_url ? (
												<img src={post.image_url} alt={post.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
											) : (
												<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-pink-50">
													<span className="text-muted-foreground">No image</span>
												</div>
											)}
											{/* Type badge */}
											<div className="absolute left-3 top-3">
												<Badge variant="secondary" className="text-xs px-3 py-1 backdrop-blur-md bg-white/60 dark:bg-black/40">
													{POST_TYPES.find(t => t.value === post.post_type)?.label || post.post_type}
												</Badge>
											</div>
										</div>

										<CardContent className="pt-4 pb-4 px-4 md:px-5">
											<h3 className="text-lg font-semibold line-clamp-2 mb-2 group-hover:text-primary">{post.title}</h3>
											<p className="text-sm text-muted-foreground mb-3 line-clamp-3 whitespace-pre-wrap">{post.content}</p>

											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<Avatar className="h-9 w-9 cursor-pointer" onClick={(e) => handleMentorClick(post.mentor.id, e as any)}>
														<AvatarImage src={post.mentor.profile_image || undefined} />
														<AvatarFallback>{post.mentor.name.charAt(0)}</AvatarFallback>
													</Avatar>
													<div>
														<div className="text-sm font-medium">{post.mentor.name}</div>
														<div className="text-xs text-muted-foreground">{post.mentor.department}</div>
													</div>
												</div>
												<div className="flex items-center gap-4">
													<button onClick={(e) => handleLike(post.id, e)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors">
														<Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
														<span className="text-sm font-medium">{post.likes_count}</span>
													</button>
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<MessageCircle className="h-4 w-4" />
														<span className="text-sm font-medium">{post.comments_count}</span>
													</div>
												</div>
											</div>
										</CardContent>
									</Card>
								</article>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
};
