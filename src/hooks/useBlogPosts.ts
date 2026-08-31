import { useCallback, useEffect, useState } from "react";
import {
  getBlogPosts,
  getBlogPostBySlug,
  getMyBlogPosts,
  type BlogPost,
  type BlogPostSummary,
  type MyBlogPost,
} from "@/integrations/supabase/services/blog-posts";

export const useBlogPosts = (options: { search?: string; tag?: string; limit?: number; offset?: number } = {}) => {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const { search, tag, limit, offset } = options;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, total: count } = await getBlogPosts({ search, tag, limit, offset });
      setPosts(data);
      setTotal(count);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
    } finally {
      setLoading(false);
    }
  }, [search, tag, limit, offset]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, total, loading, refetch: fetchPosts };
};

export const useBlogPost = (slug: string | undefined) => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      setPost(await getBlogPostBySlug(slug));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return { post, loading, refetch: fetchPost };
};

export const useMyBlogPosts = () => {
  const [posts, setPosts] = useState<MyBlogPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await getMyBlogPosts());
    } catch (error) {
      console.error("Error fetching my blog posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, refetch: fetchPosts };
};
