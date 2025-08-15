
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
  image_url?: string | null;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    profile_image: string | null;
  } | null;
};

export type CreatePostData = {
  title: string;
  content: string;
  post_type: string;
  tags?: string[];
  image_url?: string;
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

// Get a single community post by ID
export const getCommunityPostById = async (postId: string) => {
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
    .eq('id', postId)
    .single();

  if (error) {
    console.error('Error fetching community post:', error);
    return { data: null, error };
  }

  return { data: data as CommunityPost, error: null };
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
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Sanitize inputs
    const sanitizedPostData = {
      mentor_id: user.id,
      title: sanitizeInput(postData.title, 300),
      content: sanitizeInput(postData.content, 5000),
      post_type: postData.post_type,
      tags: postData.tags ? postData.tags.map(tag => sanitizeInput(tag, 50)).slice(0, 10) : [],
      image_url: postData.image_url
    };

    const { data, error } = await supabase
      .from('community_posts')
      .insert(sanitizedPostData)
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
  } catch (error) {
    console.error('Exception in createCommunityPost:', error);
    return { data: null, error };
  }
};

// Update a community post
export const updateCommunityPost = async (postId: string, updateData: UpdatePostData) => {
  try {
    // Sanitize inputs if provided
    const sanitizedUpdate: any = { updated_at: new Date().toISOString() };
    
    if (updateData.title) sanitizedUpdate.title = sanitizeInput(updateData.title, 300);
    if (updateData.content) sanitizedUpdate.content = sanitizeInput(updateData.content, 5000);
    if (updateData.post_type) sanitizedUpdate.post_type = updateData.post_type;
    if (updateData.tags) sanitizedUpdate.tags = updateData.tags.map(tag => sanitizeInput(tag, 50)).slice(0, 10);
    if (updateData.image_url) sanitizedUpdate.image_url = updateData.image_url;
    if (updateData.status) sanitizedUpdate.status = updateData.status;

    const { data, error } = await supabase
      .from('community_posts')
      .update(sanitizedUpdate)
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
  } catch (error) {
    console.error('Exception in updateCommunityPost:', error);
    return { data: null, error };
  }
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

// Get post comments with LEFT JOIN for user info
export const getPostComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_comments')
    .select(`
      *,
      user:users(
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

  return { data: data as PostComment[], error: null };
};

// Add a comment to a post
export const addPostComment = async (postId: string, content: string) => {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { error: new Error('User not authenticated') };

    // Sanitize comment content
    const sanitizedContent = sanitizeInput(content, 1000);
    if (!sanitizedContent.trim()) {
      return { error: new Error('Comment content cannot be empty') };
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: sanitizedContent,
      })
      .select(`
        *,
        user:users(
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

    return { data: data as PostComment, error: null };
  } catch (error) {
    console.error('Exception in addPostComment:', error);
    return { data: null, error };
  }
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

// Upload community post image with validation
export const uploadCommunityPostImage = async (file: File) => {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }
    
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('Community Post Images')
      .upload(filePath, file);
    
    if (error) {
      console.error("Error uploading community post image:", error);
      throw error;
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('Community Post Images')
      .getPublicUrl(filePath);
    
    return { path: filePath, url: publicUrl };
  } catch (error) {
    console.error("Exception in uploadCommunityPostImage:", error);
    throw error;
  }
};

// Input sanitization utility
function sanitizeInput(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, ''); // Remove script tags
  
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}
