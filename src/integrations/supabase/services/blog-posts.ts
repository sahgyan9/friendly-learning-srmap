import { supabase } from "@/integrations/supabase/client";
import { downscaleImage } from "@/lib/image/downscale";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { IMAGE_UPLOAD_CACHE_CONTROL } from "@/lib/constants";

/**
 * blog_posts, get_blog_posts/get_blog_post_by_slug/get_my_blog_posts, and the
 * blog-posts storage bucket are new (20260831190000_blog_posts.sql) and this
 * repo's generated Database types have not been regenerated against a live
 * schema since — `supabase as any` here matches the same workaround already
 * used elsewhere in this codebase for a table ahead of codegen (see
 * useSearchResults.ts's search_result_quality query). The row shapes below
 * are typed by hand instead.
 */
const db = supabase as any;

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  tags: string[];
  author_id: string;
  author_name: string | null;
  author_image: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
}

export interface BlogPost extends BlogPostSummary {
  content_html: string;
  content_text: string;
  is_published: boolean;
}

export interface MyBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostInput {
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  content_html: string;
  content_text: string;
  tags?: string[];
  is_published?: boolean;
}

export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

export const getBlogPosts = async (
  options: { search?: string; tag?: string; limit?: number; offset?: number } = {},
): Promise<{ data: BlogPostSummary[]; total: number }> => {
  const { data, error } = await db.rpc("get_blog_posts", {
    p_search: options.search ?? null,
    p_tag: options.tag ?? null,
    p_limit: options.limit ?? 20,
    p_offset: options.offset ?? 0,
  });

  if (error) {
    console.error("Error fetching blog posts:", error);
    throw error;
  }

  const rows = (data ?? []) as (BlogPostSummary & { total_count: number })[];
  return { data: rows, total: rows[0]?.total_count ?? 0 };
};

/** Public reader lookup — RLS-equivalent visibility (published, or the
 * viewer is the author previewing a draft, or an admin) is enforced inside
 * the RPC itself since it runs SECURITY DEFINER. */
export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await db.rpc("get_blog_post_by_slug", { p_slug: slug });

  if (error) {
    console.error("Error fetching blog post by slug:", error);
    return null;
  }

  const rows = (data ?? []) as BlogPost[];
  return rows[0] ?? null;
};

export const getMyBlogPosts = async (): Promise<MyBlogPost[]> => {
  const { data, error } = await db.rpc("get_my_blog_posts");

  if (error) {
    console.error("Error fetching my blog posts:", error);
    throw error;
  }

  return (data ?? []) as MyBlogPost[];
};

export const createBlogPost = async (authorId: string, input: CreateBlogPostInput) => {
  const { data, error } = await db
    .from("blog_posts")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      cover_image_url: input.cover_image_url ?? null,
      content_html: sanitizeBlogHtml(input.content_html),
      content_text: input.content_text,
      tags: input.tags ?? [],
      is_published: input.is_published ?? false,
      author_id: authorId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating blog post:", error);
    throw error;
  }

  return data;
};

export const updateBlogPost = async (id: string, updates: UpdateBlogPostInput) => {
  const patch: Record<string, unknown> = { ...updates };
  if (typeof updates.content_html === "string") {
    patch.content_html = sanitizeBlogHtml(updates.content_html);
  }

  const { data, error } = await db.from("blog_posts").update(patch).eq("id", id).select().single();

  if (error) {
    console.error("Error updating blog post:", error);
    throw error;
  }

  return data;
};

export const deleteBlogPost = async (id: string) => {
  const { error } = await db.from("blog_posts").delete().eq("id", id);

  if (error) {
    console.error("Error deleting blog post:", error);
    throw error;
  }
};

export const slugify = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Best-effort: speeds up when a newly published post becomes searchable in
 * /ask, but the hourly embed-knowledge cron catches up regardless if this
 * fails. Same idiom as articles.ts's triggerEmbedding. */
export const triggerEmbedding = async () => {
  try {
    await supabase.functions.invoke("embed-knowledge");
  } catch (error) {
    console.error("Best-effort embed-knowledge trigger failed (cron will catch up):", error);
  }
};

/** Fire-and-forget — a missed view count is not worth surfacing an error for. */
export const incrementBlogPostViews = (slug: string) => {
  db.rpc("increment_blog_post_views", { p_slug: slug }).then(({ error }: { error: unknown }) => {
    if (error) console.error("Failed to record blog post view:", error);
  });
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The bucket's id, which is what the Storage API addresses — see
 * community-posts.ts's POST_IMAGE_BUCKET comment for why this matters. */
export const BLOG_IMAGE_BUCKET = "blog-posts";

export const uploadBlogPostImage = async (original: File) => {
  if (!ALLOWED_IMAGE_TYPES.includes(original.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
  }
  if (original.size > MAX_IMAGE_BYTES) {
    throw new Error("File size too large. Maximum size is 5MB.");
  }

  const file = await downscaleImage(original);
  const fileExt = file.name.split(".").pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from(BLOG_IMAGE_BUCKET)
    .upload(filePath, file, { cacheControl: IMAGE_UPLOAD_CACHE_CONTROL });
  if (error) {
    console.error("Error uploading blog post image:", error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BLOG_IMAGE_BUCKET).getPublicUrl(filePath);

  return { path: filePath, url: publicUrl };
};
