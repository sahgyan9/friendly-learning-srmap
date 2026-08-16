import {
  BookOpen,
  ClipboardList,
  Megaphone,
  MessagesSquare,
  Microscope,
  Puzzle,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";
import { downscaleImage } from "@/lib/image/downscale";
import { storagePathFromPublicUrl } from "@/lib/image/storage-path";

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
  /** Null on a board post. Set means the post lives inside that community. */
  community: { id: string; name: string; slug: string } | null;
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
  image_url?: string | null;
  image_urls?: string[];
  /** Omit for the public board. Set to post inside a community you belong to. */
  community_id?: string;
};

export type UpdatePostData = Partial<CreatePostData> & { status?: string };

/**
 * Resolves post image(s) into an array of URLs.
 * Handles single legacy URL strings, JSON stringified arrays, and comma-separated lists.
 */
export function getPostImageUrls(imageUrl: string | null | undefined): string[] {
  if (!imageUrl) return [];
  const trimmed = imageUrl.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && Boolean(u.trim()));
      }
    } catch {
      // Fallthrough to standard string handling
    }
  }
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [trimmed];
}

export type CommunityFeedOptions = {
  postType?: string;
  search?: string;
  limit?: number;
  offset?: number;
  /**
   * Which room to read. Undefined means the public board, and the RPC reads
   * that as `community_id is null` — so group posts can never appear on the
   * board by forgetting to pass anything.
   */
  communityId?: string;
  /** Limit the feed to the signed-in caller's own posts. */
  mine?: boolean;
};

/** Every post kind the board supports, in the order students see them. */
export const POST_TYPES = [
  { value: "all", label: "All posts", icon: ClipboardList },
  { value: "hackathon", label: "Hackathon partners", icon: Zap },
  { value: "study-help", label: "Study help", icon: BookOpen },
  { value: "project", label: "Project ideas", icon: Wrench },
  { value: "research", label: "Research collaboration", icon: Microscope },
  { value: "problem-solving", label: "Problem solving", icon: Puzzle },
  { value: "achievement", label: "Achievement", icon: Trophy },
  { value: "announcement", label: "Announcements", icon: Megaphone },
  { value: "general", label: "General discussion", icon: MessagesSquare },
] as const;

export const POST_STATUSES = [
  { value: "open", label: "Open" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "closed", label: "Closed" },
] as const;

export function getPostTypeMeta(value: string) {
  return POST_TYPES.find((type) => type.value === value) ?? POST_TYPES[POST_TYPES.length - 1];
}

/**
 * Post count per category on the public board.
 *
 * Added by migration 20260802100000 and so not in the generated types; the cast
 * is kept to this one call rather than hand-editing types.ts, which the next
 * regeneration would throw away.
 */
export const getPostTypeCounts = async () => {
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
  ) => Promise<{ data: { post_type: string; post_count: number }[] | null; error: unknown }>)(
    "community_post_type_counts",
  );

  if (error) {
    // An empty map means "counts unknown", and the caller falls back to showing
    // every category — the behaviour before counts existed. A filter row that
    // vanishes because one RPC failed would be much worse than one that is
    // merely longer than it needs to be.
    console.error("Could not read post type counts:", error);
    return {} as Record<string, number>;
  }

  return Object.fromEntries(
    (data ?? []).map((row) => [row.post_type, Number(row.post_count)]),
  ) as Record<string, number>;
};

/**
 * The types that are a request for help, as opposed to something being told.
 *
 * An announcement with no replies is an announcement working correctly. Only
 * these types are asks, so only these can be waiting on an answer.
 */
const ASK_TYPES = new Set(["hackathon", "study-help", "project", "research", "problem-solving"]);

/**
 * Whether this post is an unanswered request.
 *
 * Everything here comes from the row itself — status is set by the author, and
 * comments_count is maintained by a trigger. Nothing is inferred or estimated,
 * which matters because the badge this drives is a claim that somebody is still
 * waiting.
 */
export function isAwaitingReply(post: Pick<CommunityPost, "post_type" | "status" | "comments_count">) {
  return ASK_TYPES.has(post.post_type) && post.status === "open" && post.comments_count === 0;
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
  community_id: string | null;
  community_name: string | null;
  community_slug: string | null;
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
    community:
      row.community_id && row.community_slug
        ? { id: row.community_id, name: row.community_name ?? "A group", slug: row.community_slug }
        : null,
  };
}

export const getCommunityPosts = async (options: CommunityFeedOptions = {}) => {
  const { postType = "all", search = "", limit = 20, offset = 0, communityId, mine = false } = options;

  const { data, error } = await supabase.rpc("get_community_feed", {
    p_post_type: postType,
    p_search: search,
    p_limit: limit,
    p_offset: offset,
    // Passed explicitly rather than left to the default, so the intent is
    // visible at the call site: undefined here means the public board.
    p_community_id: communityId,
    // Added by migration 20260802110000 and so not in the generated types yet.
    // Filtering happens in Postgres because the feed is paginated there — doing
    // it on the client would only ever filter the page you happen to be holding.
    p_mine: mine,
  } as never);

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

  let finalImageUrl: string | null = postData.image_url ?? null;
  if (postData.image_urls && postData.image_urls.length > 0) {
    finalImageUrl =
      postData.image_urls.length === 1
        ? postData.image_urls[0]
        : JSON.stringify(postData.image_urls);
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: user.id,
      title,
      content,
      post_type: postData.post_type,
      tags: (postData.tags ?? []).map((tag) => sanitizeInput(tag, 50)).filter(Boolean).slice(0, 10),
      image_url: finalImageUrl,
      community_id: postData.community_id ?? null,
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

  if (updateData.image_urls !== undefined) {
    patch.image_url =
      updateData.image_urls.length === 0
        ? null
        : updateData.image_urls.length === 1
        ? updateData.image_urls[0]
        : JSON.stringify(updateData.image_urls);
  } else if (updateData.image_url !== undefined) {
    patch.image_url = updateData.image_url;
  }

  if (updateData.tags !== undefined) {
    patch.tags = updateData.tags.map((tag) => sanitizeInput(tag, 50)).filter(Boolean).slice(0, 10);
  }

  let previousImageUrl: string | null = null;
  if (updateData.image_url !== undefined || updateData.image_urls !== undefined) {
    const { data: existing } = await supabase
      .from("community_posts")
      .select("image_url")
      .eq("id", postId)
      .maybeSingle();
    previousImageUrl = existing?.image_url ?? null;
  }

  const { error } = await supabase.from("community_posts").update(patch as any).eq("id", postId);

  if (error) {
    console.error("Error updating community post:", error);
    return { data: null, error };
  }

  if (previousImageUrl && previousImageUrl !== patch.image_url) {
    await removePostImageIfOwned(previousImageUrl);
  }

  return getCommunityPostById(postId);
};

/** Removes post image(s) from storage if the URLs are actually ours. Never throws. */
async function removePostImageIfOwned(imageUrl: string) {
  const urls = getPostImageUrls(imageUrl);
  for (const url of urls) {
    const path = storagePathFromPublicUrl(POST_IMAGE_BUCKET, url);
    if (!path) continue;
    const { error } = await supabase.storage.from(POST_IMAGE_BUCKET).remove([path]);
    if (error) console.error("Error removing community post image:", error);
  }
}

export const deleteCommunityPost = async (postId: string) => {
  const { data: existing } = await supabase
    .from("community_posts")
    .select("image_url")
    .eq("id", postId)
    .maybeSingle();

  const { error } = await supabase.from("community_posts").delete().eq("id", postId);

  if (error) {
    console.error("Error deleting community post:", error);
    return { error };
  }

  // Deliberately after the row delete succeeds: a failed storage removal
  // leaves a harmless orphaned file, while doing it the other way round risks
  // deleting the image out from under a post whose row delete then fails.
  if (existing?.image_url) {
    await removePostImageIfOwned(existing.image_url);
  }

  return { error: null };
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
export const POST_IMAGE_BUCKET = "community-posts";

export const uploadCommunityPostImage = async (original: File) => {
  if (!ALLOWED_IMAGE_TYPES.includes(original.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
  }
  if (original.size > MAX_IMAGE_BYTES) {
    throw new Error("File size too large. Maximum size is 5MB.");
  }

  // Shrunk here rather than in the modal so no future caller can skip it. The
  // post column renders at most 512 CSS px wide; uploading a 12-megapixel phone
  // photo to fill it costs the storage bill once and every reader's data
  // allowance forever. Returns the original untouched if it cannot help.
  const file = await downscaleImage(original);

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

export const uploadCommunityPostImages = async (files: File[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const { url } = await uploadCommunityPostImage(file);
    urls.push(url);
  }
  return urls;
};
