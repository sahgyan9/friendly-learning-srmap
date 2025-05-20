
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

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
  created_at?: string;
  updated_at?: string;
}

export type MarketplacePostInput = Omit<MarketplacePost, "id" | "created_at" | "updated_at">;

export type CategoryType = 'all' | 'news' | 'events' | 'ads' | 'courses';

export async function fetchMarketplacePosts(category?: CategoryType) {
  try {
    // Use type assertion for the entire query chain
    let query = supabase.from("marketplace_posts").select("*") as any;
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    query = query.order('date', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as MarketplacePost[];
  } catch (error) {
    console.error("Error fetching marketplace posts:", error);
    throw error;
  }
}

export async function fetchMarketplacePost(id: string) {
  try {
    // Use type assertion for the entire query chain
    const { data, error } = await (supabase
      .from("marketplace_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle() as any);
    
    if (error) {
      throw error;
    }
    
    return data as MarketplacePost | null;
  } catch (error) {
    console.error("Error fetching marketplace post:", error);
    throw error;
  }
}

export async function createMarketplacePost(post: MarketplacePostInput) {
  try {
    // Use type assertion for the entire query chain
    const { data, error } = await (supabase
      .from("marketplace_posts")
      .insert(post as any)
      .select()
      .single() as any);
    
    if (error) {
      throw error;
    }
    
    return data as MarketplacePost;
  } catch (error) {
    console.error("Error creating marketplace post:", error);
    throw error;
  }
}

export async function updateMarketplacePost(id: string, post: Partial<MarketplacePostInput>) {
  try {
    // Use type assertion for the entire query chain
    const { data, error } = await (supabase
      .from("marketplace_posts")
      .update({ ...post, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single() as any);
    
    if (error) {
      throw error;
    }
    
    return data as MarketplacePost;
  } catch (error) {
    console.error("Error updating marketplace post:", error);
    throw error;
  }
}

export async function deleteMarketplacePost(id: string) {
  try {
    // Use type assertion for the entire query chain
    const { error } = await (supabase
      .from("marketplace_posts")
      .delete()
      .eq("id", id) as any);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting marketplace post:", error);
    throw error;
  }
}

export async function uploadMarketplaceImage(file: File) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `marketplace/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('marketplace')
      .upload(filePath, file);
    
    if (error) {
      throw error;
    }
    
    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('marketplace')
      .getPublicUrl(filePath);
    
    return { path: data.path, url: publicUrl };
  } catch (error) {
    console.error("Error uploading marketplace image:", error);
    throw error;
  }
}

export async function deleteMarketplaceImage(path: string) {
  try {
    const { error } = await supabase.storage
      .from('marketplace')
      .remove([path]);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting marketplace image:", error);
    throw error;
  }
}
