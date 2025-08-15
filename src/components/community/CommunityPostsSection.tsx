import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Heart,
	MessageCircle,
	ChevronLeft,
	ChevronRight,
	ArrowRight,
	Calendar,
	Bookmark,
	Share2,
	ArrowUpRight,
	FlameIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { getCommunityPosts, togglePostLike, checkUserLikedPost, type CommunityPost } from "@/integrations/supabase/services/community-posts";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const POST_TYPES = [
	{ value: 'hackathon', label: 'Hackathon Partners', icon: <FlameIcon className="h-3 w-3 mr-1" /> },
	{ value: 'research', label: 'Research Collaboration', icon: <Calendar className="h-3 w-3 mr-1" /> },
	{ value: 'problem-solving', label: 'Problem Solving', icon: <ArrowUpRight className="h-3 w-3 mr-1" /> },
	{ value: 'project', label: 'Project Ideas', icon: <Share2 className="h-3 w-3 mr-1" /> },
	{ value: 'general', label: 'General Discussion', icon: <MessageCircle className="h-3 w-3 mr-1" /> },
];

export const CommunityPostsSection = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [posts, setPosts] = useState<CommunityPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [scrollPosition, setScrollPosition] = useState(0);
	const [activeIndex, setActiveIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isTouching, setIsTouching] = useState(false);
	const [touchStartX, setTouchStartX] = useState(0);
	const [touchScrollLeft, setTouchScrollLeft] = useState(0);
	const [isHovering, setIsHovering] = useState<string | null>(null);

	useEffect(() => {
		fetchPosts();

		// Add scroll listener to update activeIndex
		const container = containerRef.current;
		if (container) {
			const handleScroll = () => {
				setScrollPosition(container.scrollLeft);

				// Calculate active card based on scroll position
				if (container.children.length > 2) { // Account for spacers
					const cardWidth = 400; // Approximate width of a card + gap
					const scrollPos = container.scrollLeft;
					const newIndex = Math.round(scrollPos / cardWidth);
					setActiveIndex(Math.min(newIndex, posts.length - 1));
				}
			};

			container.addEventListener('scroll', handleScroll);
			return () => container.removeEventListener('scroll', handleScroll);
		}
	}, [posts.length]);

	const fetchPosts = async () => {
		setLoading(true);
		const { data, error } = await getCommunityPosts(8); // Get latest 8 posts

		if (error) {
			console.error('Error fetching community posts:', error);
		} else if (data) {
			// Check like status for each post if user is logged in
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

	const handleMentorClick = (mentorId: string, event: React.MouseEvent) => {
		event.stopPropagation();
		navigate(`/mentors/${mentorId}`);
	};

	const handleBookmark = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!user) {
			toast.error("Please sign in to bookmark posts");
			return;
		}
		toast.success("Post bookmarked");
	}

	const handleShare = (postId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(`${window.location.origin}/community-posts/${postId}`);
		toast.success("Link copied to clipboard!");
	}

	const scroll = (direction: 'left' | 'right') => {
		const container = containerRef.current;
		if (container) {
			const card = container.querySelector('.community-post-card');
			const cardWidth = card ? (card as HTMLElement).offsetWidth : 320;
			const gap = 16; // gap-4
			const visibleCards = window.innerWidth >= 768 ? 2 : 1;
			const scrollAmount = visibleCards * (cardWidth + gap);
			const newPosition = direction === 'left'
				? Math.max(0, container.scrollLeft - scrollAmount)
				: Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + scrollAmount);
			container.scrollTo({ left: newPosition, behavior: 'smooth' });
			setScrollPosition(newPosition);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'fulfilled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
			default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
		}
	};

	// Get post type information including icon
	const getPostTypeInfo = (postType: string) => {
		return POST_TYPES.find(type => type.value === postType) ||
			{ value: postType, label: postType, icon: <MessageCircle className="h-3 w-3 mr-1" /> };
	};

	// Loading state with skeleton UI
	if (loading) {
		return (
			<section className="py-16 bg-gradient-to-b from-background to-muted/30">
				<div className="container mx-auto px-4">
					<div className="flex items-center justify-between mb-8">
						<div>
							<div className="h-8 bg-muted rounded w-64 animate-pulse mb-2"></div>
							<div className="h-4 bg-muted rounded w-80 animate-pulse"></div>
						</div>
						<div className="flex gap-2">
							<div className="h-10 w-10 rounded-md bg-muted animate-pulse"></div>
							<div className="h-10 w-28 rounded-md bg-muted animate-pulse"></div>
						</div>
					</div>
					<div className="flex gap-4 overflow-x-hidden">
						{[1, 2, 3].map((_, i) => (
							<div key={i} className="flex-shrink-0 w-80 md:w-[400px]">
								<div className="h-[380px] bg-muted rounded-xl animate-pulse"></div>
							</div>
						))}
					</div>
				</div>
			</section>
		);
	}

	if (posts.length === 0) {
		return null;
	}

	return (
		<section className="py-16 bg-gradient-to-b from-background to-muted/20">
			<div className="container mx-auto px-4">
				{/* Header with animated underline */}
				<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
					<div className="relative">
						<h2 className="text-3xl font-bold mb-2 inline-block">
							Community Posts
							<div className="absolute bottom-0 left-0 h-1 bg-primary/80 w-3/4 rounded-full"></div>
						</h2>
						<p className="text-muted-foreground">
							Connect with mentors for hackathons, research, and collaboration
						</p>
					</div>

					<div className="flex items-center gap-4">
						{/* Navigation buttons */}
						<div className="flex gap-2">
							<motion.div whileTap={{ scale: 0.95 }}>
								<Button
									variant="outline"
									size="icon"
									onClick={() => scroll('left')}
									disabled={scrollPosition === 0}
									className="rounded-full shadow-sm h-10 w-10"
								>
									<ChevronLeft className="h-5 w-5" />
								</Button>
							</motion.div>
							<motion.div whileTap={{ scale: 0.95 }}>
								<Button
									variant="outline"
									size="icon"
									onClick={() => scroll('right')}
									className="rounded-full shadow-sm h-10 w-10"
								>
									<ChevronRight className="h-5 w-5" />
								</Button>
							</motion.div>
						</div>
						<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
							<Link to="/community-posts">
								<Button variant="default" className="flex items-center gap-2 rounded-full shadow-sm">
									View All Posts
									<ArrowRight className="h-4 w-4" />
								</Button>
							</Link>
						</motion.div>
					</div>
				</div>

				{/* Page indicator dots */}
				<div className="flex justify-center mb-6">
					<div className="flex space-x-2">
						{posts.slice(0, Math.min(posts.length, 8)).map((_, index) => (
							<button
								key={index}
								onClick={() => {
									const container = containerRef.current;
									if (container) {
										const card = container.querySelector('.community-post-card');
										const cardWidth = card ? (card as HTMLElement).offsetWidth : 320;
										const gap = 16;
										container.scrollTo({
											left: index * (cardWidth + gap),
											behavior: 'smooth'
										});
									}
								}}
								className={`w-2 h-2 rounded-full transition-all duration-300 ${activeIndex === index
										? 'bg-primary w-6'
										: 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
									}`}
								aria-label={`Go to slide ${index + 1}`}
							/>
						))}
					</div>
				</div>

				{/* Centered Scrollable Posts Container with Spacers and scroll-snap */}
				<div className="relative">
					{/* Left arrow button */}
					<motion.div
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.3 }}
						className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
					>
						<Button
							variant="outline"
							size="icon"
							className="hidden md:flex bg-background/90 backdrop-blur-sm rounded-full shadow-md border border-border hover:bg-muted transition h-12 w-12"
							onClick={() => scroll('left')}
							disabled={scrollPosition === 0}
						>
							<ChevronLeft className="h-6 w-6" />
						</Button>
					</motion.div>

					<div
						id="community-posts-scroll"
						ref={containerRef}
						className="flex gap-6 overflow-x-auto scrollbar-hide pb-6 md:snap-x md:snap-mandatory items-stretch"
						style={{
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
							WebkitOverflowScrolling: 'touch',
							paddingLeft: '16px',
							paddingRight: '16px'
						}}
					>
						{/* Left Spacer: half container width minus card width */}
						<div className="hidden md:block flex-shrink-0" style={{ width: 'calc(50vw - 240px)' }} />

						{posts.map((post, index) => (
							<motion.div
								key={post.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1, duration: 0.4 }}
								className="community-post-card flex-shrink-0 w-80 md:w-[420px] snap-center"
								style={{ scrollSnapAlign: 'center' }}
								onMouseEnter={() => setIsHovering(post.id)}
								onMouseLeave={() => setIsHovering(null)}
							>
								<Card
									className={`h-full cursor-pointer transition-all duration-300 rounded-xl border overflow-hidden
                    ${isHovering === post.id ? 'shadow-xl scale-[1.02] border-primary/20' : 'shadow-md hover:shadow-lg'}`}
									onClick={() => navigate(`/community-posts/${post.id}`)}
								>
									{/* Card header with gradient overlay for image posts */}
									{post.image_url && (
										<div className="relative w-full h-40 overflow-hidden">
											<img
												src={post.image_url}
												alt="Post cover"
												className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
												onError={(e) => (e.currentTarget.style.display = 'none')}
											/>
											<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

											{/* Status badge */}
											<Badge
												variant="outline"
												className={`absolute top-3 right-3 text-xs ${getStatusColor(post.status)} backdrop-blur-sm`}
											>
												{post.status}
											</Badge>

											{/* Author info on image */}
											<div className="absolute bottom-3 left-3 flex items-center gap-2">
												<Avatar
													className="h-8 w-8 ring-2 ring-white/70 cursor-pointer hover:ring-primary transition-all"
													onClick={(e) => handleMentorClick(post.mentor.id, e)}
												>
													<AvatarImage src={post.mentor.profile_image || undefined} />
													<AvatarFallback className="bg-primary/80 text-primary-foreground">
														{post.mentor.name.charAt(0)}
													</AvatarFallback>
												</Avatar>
												<div>
													<h4
														className="font-semibold text-sm text-white cursor-pointer hover:text-primary-foreground transition-colors"
														onClick={(e) => handleMentorClick(post.mentor.id, e)}
													>
														{post.mentor.name}
													</h4>
													<p className="text-xs text-white/80">{post.mentor.department}</p>
												</div>
											</div>
										</div>
									)}

									{/* Regular header for non-image posts */}
									{!post.image_url && (
										<CardHeader className="pb-2 pt-4">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<Avatar
														className="h-9 w-9 ring-2 ring-background cursor-pointer hover:ring-primary/20 transition-all shadow-sm"
														onClick={(e) => handleMentorClick(post.mentor.id, e)}
													>
														<AvatarImage src={post.mentor.profile_image || undefined} />
														<AvatarFallback className="bg-primary/10 text-primary font-semibold">
															{post.mentor.name.charAt(0)}
														</AvatarFallback>
													</Avatar>
													<div>
														<h4
															className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
															onClick={(e) => handleMentorClick(post.mentor.id, e)}
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
										</CardHeader>
									)}

									<CardContent className={`${post.image_url ? 'pt-4' : 'pt-2'} space-y-3`}>
										{/* Post type ribbon with gradient */}
										<div className="flex items-center mb-2">
											<div
												className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-primary/20 to-primary/5 text-primary-foreground/90 shadow-sm"
											>
												{getPostTypeInfo(post.post_type).icon}
												{getPostTypeInfo(post.post_type).label}
											</div>
											<div className="ml-auto text-xs text-muted-foreground">
												{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
											</div>
										</div>

										{/* Post title and content */}
										<div>
											<h3 className="font-semibold text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
												{post.title}
											</h3>
											<p className="text-sm text-muted-foreground line-clamp-3">
												{post.content}
											</p>
										</div>

										{/* Tags with hover effect */}
										{post.tags && post.tags.length > 0 && (
											<div className="flex flex-wrap gap-1.5 pt-1">
												{post.tags.slice(0, 3).map((tag, index) => (
													<Badge
														key={index}
														variant="outline"
														className="text-xs py-0 hover:bg-muted transition-colors cursor-default"
													>
														#{tag}
													</Badge>
												))}
												{post.tags.length > 3 && (
													<span className="text-xs text-muted-foreground">
														+{post.tags.length - 3} more
													</span>
												)}
											</div>
										)}
									</CardContent>

									{/* Interactive footer */}
									<CardFooter className="flex items-center justify-between pt-3 pb-4 px-6 border-t bg-muted/20">
										<div className="flex items-center gap-4">
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={(e) => handleLike(post.id, e)}
												className={`flex items-center gap-1.5 text-sm ${post.user_has_liked
														? 'text-red-500'
														: 'text-muted-foreground hover:text-red-500'
													} transition-colors`}
											>
												<Heart className={`h-4 w-4 ${post.user_has_liked ? 'fill-red-500' : ''}`} />
												<span className="font-medium text-xs">{post.likes_count}</span>
											</motion.button>

											<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
												<MessageCircle className="h-4 w-4" />
												<span className="font-medium text-xs">{post.comments_count}</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={(e) => handleBookmark(e)}
												className="text-muted-foreground hover:text-primary transition-colors"
											>
												<Bookmark className="h-4 w-4" />
											</motion.button>

											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={(e) => handleShare(post.id, e)}
												className="text-muted-foreground hover:text-primary transition-colors"
											>
												<Share2 className="h-4 w-4" />
											</motion.button>
										</div>
									</CardFooter>
								</Card>
							</motion.div>
						))}

						{/* Right Spacer: half container width minus card width */}
						<div className="hidden md:block flex-shrink-0" style={{ width: 'calc(50vw - 240px)' }} />
					</div>

					{/* Right arrow button */}
					<motion.div
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.3 }}
						className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
					>
						<Button
							variant="outline"
							size="icon"
							className="hidden md:flex bg-background/90 backdrop-blur-sm rounded-full shadow-md border border-border hover:bg-muted transition h-12 w-12"
							onClick={() => scroll('right')}
						>
							<ChevronRight className="h-6 w-6" />
						</Button>
					</motion.div>
				</div>
			</div>
		</section>
	);
};
