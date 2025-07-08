
import { useState, useEffect } from "react";
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
	const [scrollPosition, setScrollPosition] = useState(0);

	useEffect(() => {
		fetchPosts();
	}, []);

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

	const handleLike = async (postId: string) => {
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

	const scroll = (direction: 'left' | 'right') => {
		const container = document.getElementById('community-posts-scroll');
		if (container) {
			const scrollAmount = 320; // Width of card + gap
			const newPosition = direction === 'left' 
				? Math.max(0, scrollPosition - scrollAmount)
				: Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
			
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

	if (loading || posts.length === 0) {
		return null; // Don't show section if no posts or still loading
	}

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
					<div className="flex items-center gap-4">
						{/* Navigation buttons */}
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => scroll('left')}
								disabled={scrollPosition === 0}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => scroll('right')}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
						<Link to="/community-posts">
							<Button variant="outline" className="flex items-center gap-2">
								View All Posts
								<ArrowRight className="h-4 w-4" />
							</Button>
						</Link>
					</div>
				</div>
				{/* Centered Scrollable Posts Container */}
				<div 
					id="community-posts-scroll"
					className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 justify-center"
					style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
				>
					{posts.map((post) => (
						<Card 
							key={post.id} 
							className="flex-shrink-0 w-80 cursor-pointer hover:shadow-lg transition-shadow"
							onClick={() => navigate(`/community-posts/${post.id}`)}
						>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<Avatar 
											className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
											onClick={(e) => handleMentorClick(post.mentor.id, e)}
										>
											<AvatarImage src={post.mentor.profile_image || undefined} />
											<AvatarFallback>{post.mentor.name.charAt(0)}</AvatarFallback>
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
							<CardContent className="pt-0 space-y-3">
								{post.image_url && (
									<div className="mb-2 w-full h-40 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
										<img
											src={post.image_url}
											alt="Post image"
											className="object-cover w-full h-full"
											onError={(e) => (e.currentTarget.style.display = 'none')}
										/>
									</div>
								)}
								<div>
									<h3 className="font-semibold text-sm mb-2 line-clamp-2">{post.title}</h3>
									<p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
								</div>
								
								{/* Post Type */}
								<Badge variant="secondary" className="text-xs">
									{POST_TYPES.find(type => type.value === post.post_type)?.label || post.post_type}
								</Badge>
								
								{/* Tags */}
								{post.tags && post.tags.length > 0 && (
									<div className="flex flex-wrap gap-1">
										{post.tags.slice(0, 2).map((tag, index) => (
											<Badge key={index} variant="outline" className="text-xs">
												{tag}
											</Badge>
										))}
										{post.tags.length > 2 && (
											<span className="text-xs text-muted-foreground">
												+{post.tags.length - 2} more
											</span>
										)}
									</div>
								)}
								
								{/* Footer */}
								<div className="flex items-center justify-between pt-2 border-t">
									<div className="flex items-center gap-3">
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleLike(post.id);
											}}
											className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
										>
											<Heart className={`h-3 w-3 ${post.user_has_liked ? 'fill-red-500 text-red-500' : ''}`} />
											{post.likes_count}
										</button>
										
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<MessageCircle className="h-3 w-3" />
											{post.comments_count}
										</div>
									</div>
									
									<span className="text-xs text-muted-foreground">
										{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
									</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
};
