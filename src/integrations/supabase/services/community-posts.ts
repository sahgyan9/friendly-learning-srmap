import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";

/**
 * A post as rendered in the feed. Author fields are flattened by the
 * `get_community_feed` / `get_community_post` RPCs, which also fold in the
 * caller's like state — the feed used to issue one extra query per post to
 * work that out.
 */
export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  post_type: string;
  status: string;
  tags: string[] | null;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    profile_image: string | null;
    department: string | null;
    role: string | null;
    is_mentor: boolean;
  };
  viewer_has_liked: boolean;
  viewer_is_author: boolean;
};

export type PostComment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    profile_image: string | null;
  };
  viewer_is_author: boolean;
};

export type CreatePostData = {
  title: string;
  content: string;
  post_type: string;
  tags?: string[];
  image_url?: string;
};

export type UpdatePostData = Partial<CreatePostData> & { status?: string };

export type CommunityFeedOptions = {
  postType?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

/** Every post kind the board supports, in the order students see them. */
export const POST_TYPES = [
  { value: "all", label: "All posts", emoji: "📋" },
  { value: "hackathon", label: "Hackathon partners", emoji: "⚡" },
  { value: "study-help", label: "Study help", emoji: "📚" },
  { value: "project", label: "Project ideas", emoji: "🛠️" },
  { value: "research", label: "Research collaboration", emoji: "🔬" },
  { value: "problem-solving", label: "Problem solving", emoji: "🧩" },
  { value: "announcement", label: "Announcements", emoji: "📢" },
  { value: "general", label: "General discussion", emoji: "💬" },
] as const;

export const POST_STATUSES = [
  { value: "open", label: "Open" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "closed", label: "Closed" },
] as const;

export function getPostTypeMeta(value: string) {
  return POST_TYPES.find((type) => type.value === value) ?? POST_TYPES[POST_TYPES.length - 1];
}

type FeedRow = {
  id: string;
  title: string;
  content: string;
  post_type: string;
  status: string;
  tags: string[] | null;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string | null;
  author_image: string | null;
  author_department: string | null;
  author_role: string | null;
  author_is_mentor: boolean;
  viewer_has_liked: boolean;
  viewer_is_author: boolean;
  total_count?: number;
};

function toCommunityPost(row: FeedRow): CommunityPost {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    post_type: row.post_type,
    status: row.status,
    tags: row.tags,
    image_url: row.image_url,
    likes_count: row.likes_count,
    comments_count: row.comments_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: {
      id: row.author_id,
      name: row.author_name ?? "Student",
      profile_image: row.author_image,
      department: row.author_department,
      role: row.author_role,
      is_mentor: row.author_is_mentor,
    },
    viewer_has_liked: row.viewer_has_liked,
    viewer_is_author: row.viewer_is_author,
  };
}

export const getCommunityPosts = async (options: CommunityFeedOptions = {}) => {
  const { postType = "all", search = "", limit = 20, offset = 0 } = options;

  const { data, error } = await supabase.rpc("get_community_feed", {
    p_post_type: postType,
    p_search: search,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("Error fetching community posts:", error);
    return { data: null, total: 0, error };
  }

  const rows = (data ?? []) as FeedRow[];
  return {
    data: rows.map(toCommunityPost),
    total: Number(rows[0]?.total_count ?? 0),
    error: null,
  };
};

export const getCommunityPostById = async (postId: string) => {
  const { data, error } = await supabase.rpc("get_community_post", { p_post_id: postId });

  if (error) {
    console.error("Error fetching community post:", error);
    return { data: null, error };
  }

  const row = ((data ?? []) as FeedRow[])[0];
  if (!row) {
    return { data: null, error: new Error("Post not found") };
  }

  return { data: toCommunityPost(row), error: null };
};

export const getPostsByAuthor = async (authorId: string) => {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching author posts:", error);
    return { data: null, error };
  }

  return { data, error: null };
};

export const createCommunityPost = async (postData: CreatePostData) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { data: null, error: new Error("You need to be signed in to post") };
  }

  const title = sanitizeInput(postData.title, 300);
  const content = sanitizeInput(postData.content, 5000);

  if (!title.trim() || !content.trim()) {
    return { data: null, error: new Error("Title and content are required") };
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: user.id,
      title,
      content,
      post_type: postData.post_type,
      tags: (postData.tags ?? []).map((tag) => sanitizeInput(tag, 50)).filter(Boolean).slice(0, 10),
      image_url: postData.image_url ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating community post:", error);
    return { data: null, error };
  }

  return getCommunityPostById(data.id);
};

export const updateCommunityPost = async (postId: string, updateData: UpdatePostData) => {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updateData.title !== undefined) patch.title = sanitizeInput(updateData.title, 300);
  if (updateData.content !== undefined) patch.content = sanitizeInput(updateData.content, 5000);
  if (updateData.post_type !== undefined) patch.post_type = updateData.post_type;
  if (updateData.status !== undefined) patch.status = updateData.status;
  if (updateData.image_url !== undefined) patch.image_url = updateData.image_url;
  if (updateData.tags !== undefined) {
    patch.tags = updateData.tags.map((tag) => sanitizeInput(tag, 50)).filter(Boolean).slice(0, 10);
  }

  const { error } = await supabase.from("community_posts").update(patch).eq("id", postId);

  if (error) {
    console.error("Error updating community post:", error);
    return { data: null, error };
  }

  return getCommunityPostById(postId);
};

export const deleteCommunityPost = async (postId: string) => {
  const { error } = await supabase.from("community_posts").delete().eq("id", postId);

  if (error) {
    console.error("Error deleting community post:", error);
  }

  return { error };
};

export const togglePostLike = async (postId: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { error: new Error("User not authenticated"), liked: false };

  const { data: existingLike } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingLike) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    return { error, liked: false };
  }

  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: user.id });

  return { error, liked: true };
};

export const getPostComments = async (postId: string) => {
  const { data, error } = await supabase.rpc("get_post_comments", { p_post_id: postId });

  if (error) {
    console.error("Error fetching post comments:", error);
    return { data: null, error };
  }

  const comments: PostComment[] = (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author: {
      id: row.author_id,
      name: row.author_name ?? "Student",
      profile_image: row.author_image,
    },
    viewer_is_author: row.viewer_is_author,
  }));

  return { data: comments, error: null };
};

export const addPostComment = async (postId: string, content: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { data: null, error: new Error("User not authenticated") };

  const sanitizedContent = sanitizeInput(content, 1000);
  if (!sanitizedContent.trim()) {
    return { data: null, error: new Error("Comment content cannot be empty") };
  }

  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, content: sanitizedContent });

  if (error) {
    console.error("Error adding comment:", error);
    return { data: null, error };
  }

  return { data: null, error: null };
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * The bucket's **id**, which is what the Storage API addresses. Its display name
 * in the dashboard is "Community Post Images", and passing that name produced a
 * 400 on every upload because no bucket has that id — the storage policy agrees,
 * it checks `bucket_id = 'community-posts'`.
 */
const POST_IMAGE_BUCKET = "community-posts";

export const uploadCommunityPostImage = async (file: File) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("File size too large. Maximum size is 5MB.");
  }

  const fileExt = file.name.split(".").pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage.from(POST_IMAGE_BUCKET).upload(filePath, file);
  if (error) {
    console.error("Error uploading community post image:", error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(POST_IMAGE_BUCKET).getPublicUrl(filePath);

  return { path: filePath, url: publicUrl };
};
