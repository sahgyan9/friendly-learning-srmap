
import { supabase } from "@/integrations/supabase/client";
import { downscaleImage } from "@/lib/image/downscale";
import { storagePathFromPublicUrl } from "@/lib/image/storage-path";

export interface MarketplacePost {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  author: string;
  image_url?: string;
  contact_info?: string;
  external_link?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type MarketplacePostInput = Omit<MarketplacePost, "id" | "created_at" | "updated_at">;

export type CategoryType = 'all' | 'news' | 'events' | 'ads' | 'courses';

/**
 * Every marketplace column except `contact_info`.
 *
 * Contact details are personal data and are no longer readable by signed-out
 * visitors at the database level, so a signed-out request must not ask for
 * them — a listing still shows everything else.
 */
const PUBLIC_COLUMNS =
  "id, title, description, category, date, author, image_url, external_link, user_id, created_at, updated_at";
const FULL_COLUMNS = `${PUBLIC_COLUMNS}, contact_info`;

async function readableColumns() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? FULL_COLUMNS : PUBLIC_COLUMNS;
}

export async function fetchMarketplacePosts(category?: CategoryType) {
  try {
    let query = supabase.from("marketplace_posts").select(await readableColumns());

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    query = query.order('date', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error in fetchMarketplacePosts:", error);
      throw error;
    }
    
    return data as unknown as MarketplacePost[];
  } catch (error) {
    console.error("Exception in fetchMarketplacePosts:", error);
    throw error;
  }
}

export async function fetchMarketplacePost(id: string) {
  try {
    const { data, error } = await supabase
      .from("marketplace_posts")
      .select(await readableColumns())
      .eq("id", id)
      .maybeSingle();
    
    if (error) {
      console.error("Error in fetchMarketplacePost:", error);
      throw error;
    }
    
    return data as unknown as MarketplacePost | null;
  } catch (error) {
    console.error("Exception in fetchMarketplacePost:", error);
    throw error;
  }
}

export async function createMarketplacePost(post: MarketplacePostInput) {
  try {
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    // Sanitize inputs
    const sanitizedPost = {
      ...post,
      title: sanitizeInput(post.title, 200),
      description: sanitizeInput(post.description, 2000),
      author: sanitizeInput(post.author, 100),
      contact_info: post.contact_info ? sanitizeInput(post.contact_info, 500) : undefined,
      external_link: post.external_link ? sanitizeUrl(post.external_link) : undefined,
      user_id: user.id // Ensure user_id is set
    };
    
    const { data, error } = await supabase
      .from("marketplace_posts")
      .insert(sanitizedPost)
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error in createMarketplacePost:", error);
      throw error;
    }
    
    return data as MarketplacePost;
  } catch (error) {
    console.error("Exception in createMarketplacePost:", error);
    throw error;
  }
}

export async function updateMarketplacePost(id: string, post: Partial<MarketplacePostInput>) {
  try {
    // Sanitize inputs if provided
    const sanitizedUpdate: Partial<MarketplacePostInput> & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (post.title) sanitizedUpdate.title = sanitizeInput(post.title, 200);
    if (post.description) sanitizedUpdate.description = sanitizeInput(post.description, 2000);
    if (post.author) sanitizedUpdate.author = sanitizeInput(post.author, 100);
    if (post.contact_info) sanitizedUpdate.contact_info = sanitizeInput(post.contact_info, 500);
    if (post.external_link) sanitizedUpdate.external_link = sanitizeUrl(post.external_link);
    if (post.category) sanitizedUpdate.category = post.category;
    if (post.image_url) sanitizedUpdate.image_url = post.image_url;
    if (post.date) sanitizedUpdate.date = post.date;

    let previousImageUrl: string | undefined;
    if (post.image_url) {
      const { data: existing } = await supabase
        .from("marketplace_posts")
        .select("image_url")
        .eq("id", id)
        .maybeSingle();
      previousImageUrl = existing?.image_url ?? undefined;
    }

    const { data, error } = await supabase
      .from("marketplace_posts")
      .update(sanitizedUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error in updateMarketplacePost:", error);
      throw error;
    }

    if (previousImageUrl && previousImageUrl !== post.image_url) {
      await removeMarketplaceImageIfOwned(previousImageUrl);
    }

    return data as MarketplacePost;
  } catch (error) {
    console.error("Exception in updateMarketplacePost:", error);
    throw error;
  }
}

export async function deleteMarketplacePost(id: string) {
  try {
    const { data: existing } = await supabase
      .from("marketplace_posts")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("marketplace_posts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error in deleteMarketplacePost:", error);
      throw error;
    }

    // Deliberately after the row delete succeeds — see the matching comment
    // on deleteCommunityPost/deleteTeamMember.
    if (existing?.image_url) {
      await removeMarketplaceImageIfOwned(existing.image_url);
    }

    return true;
  } catch (error) {
    console.error("Exception in deleteMarketplacePost:", error);
    throw error;
  }
}

async function removeMarketplaceImageIfOwned(imageUrl: string) {
  const path = storagePathFromPublicUrl("marketplace", imageUrl);
  if (!path) return;
  try {
    await deleteMarketplaceImage(path);
  } catch (error) {
    console.error("Error removing marketplace image:", error);
  }
}

export async function uploadMarketplaceImage(original: File) {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(original.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (original.size > maxSize) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Event posters are the most likely thing here to be an untouched phone
    // photo of a printed notice. Checked against the original above so the
    // limit still means what it says, then shrunk.
    const file = await downscaleImage(original);

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('marketplace')
      .upload(filePath, file);
    
    if (error) {
      console.error("Error in uploadMarketplaceImage:", error);
      throw error;
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('marketplace')
      .getPublicUrl(filePath);
    
    return { path: filePath, url: publicUrl };
  } catch (error) {
    console.error("Exception in uploadMarketplaceImage:", error);
    throw error;
  }
}

export async function deleteMarketplaceImage(path: string) {
  try {
    const { error } = await supabase.storage
      .from('marketplace')
      .remove([path]);
    
    if (error) {
      console.error("Error in deleteMarketplaceImage:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Exception in deleteMarketplaceImage:", error);
    throw error;
  }
}

// Helper function to check if the current user is an admin
export async function isUserAdmin() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return false;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (error || !user) return false;
    
    return user.is_admin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// Input sanitization utility
function sanitizeInput(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, ''); // Remove event handlers
  
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

// URL validation and sanitization
function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol');
    }
  } catch {
    // If URL is invalid, return empty string
    return '';
  }
}

// Trigger manual sync of SRMAP events via Edge Function
export async function syncSRMAPEvents(): Promise<{ synced: number; pruned: number }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ synced: number; pruned: number; error?: string }>(
      'sync-srmap-events',
    );

    if (error) {
      console.error('Error invoking sync-srmap-events:', error);
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return {
      synced: data?.synced ?? 0,
      pruned: data?.pruned ?? 0,
    };
  } catch (error) {
    console.error('Exception in syncSRMAPEvents:', error);
    throw error;
  }
}
