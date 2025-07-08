import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type CommunityPost = Database['public']['Tables']['community_posts']['Row'] & {
  mentor: {
    id: string;
    name: string;
    profile_image: string | null;
    department: string;
    rating: number;
  };
  user_has_liked?: boolean;
  image_url?: string | null; // Added for type safety
};

export type CreatePostData = {
  title: string;
  content: string;
  post_type: string;
  tags?: string[];
  image_url?: string; // Added
};

export type UpdatePostData = Partial<CreatePostData> & {
  status?: string;
};

// Get all community posts with mentor info
export const getCommunityPosts = async (limit?: number, offset?: number) => {
  let query = supabase
    .from('community_posts')
    .select(`
      *,
      mentor:mentors!inner(
        id,
        name,
        profile_image,
        department,
        rating
      )
    `)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching community posts:', error);
    return { data: null, error };
  }

  return { data: data as CommunityPost[], error: null };
};

// Get posts by mentor
export const getPostsByMentor = async (mentorId: string) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select(`
      *,
      mentor:mentors!inner(
        id,
        name,
        profile_image,
        department,
        rating
      )
    `)
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching mentor posts:', error);
    return { data: null, error };
  }

  return { data: data as CommunityPost[], error: null };
};

// Create a new community post
export const createCommunityPost = async (postData: CreatePostData) => {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      mentor_id: (await supabase.auth.getUser()).data.user?.id,
      ...postData,
    })
    .select(`
      *,
      mentor:mentors!inner(
        id,
        name,
        profile_image,
        department,
        rating
      )
    `)
    .single();

  if (error) {
    console.error('Error creating community post:', error);
    return { data: null, error };
  }

  return { data: data as CommunityPost, error: null };
};

// Update a community post
export const updateCommunityPost = async (postId: string, updateData: UpdatePostData) => {
  const { data, error } = await supabase
    .from('community_posts')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select(`
      *,
      mentor:mentors!inner(
        id,
        name,
        profile_image,
        department,
        rating
      )
    `)
    .single();

  if (error) {
    console.error('Error updating community post:', error);
    return { data: null, error };
  }

  return { data: data as CommunityPost, error: null };
};

// Delete a community post
export const deleteCommunityPost = async (postId: string) => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting community post:', error);
    return { error };
  }

  return { error: null };
};

// Like/unlike a post
export const togglePostLike = async (postId: string) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { error: new Error('User not authenticated') };

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single();

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    return { error, liked: false };
  } else {
    // Like
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id,
      });

    return { error, liked: true };
  }
};

// Get post comments
export const getPostComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      user:users!inner(
        id,
        name,
        profile_image
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching post comments:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

// Add a comment to a post
export const addPostComment = async (postId: string, content: string) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { error: new Error('User not authenticated') };

  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
    })
    .select(`
      *,
      user:users!inner(
        id,
        name,
        profile_image
      )
    `)
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

// Check if user has liked a specific post
export const checkUserLikedPost = async (postId: string) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return { liked: false, error: null };

  const { data, error } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking user like status:', error);
    return { liked: false, error };
  }

  return { liked: !!data, error: null };
};
