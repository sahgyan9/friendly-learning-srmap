import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type KnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Row'];
export type CreateKnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Insert'];
export type UpdateKnowledgeArticle = Database['public']['Tables']['knowledge_articles']['Update'];

export const getArticles = async () => {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }

  return { data, error: null };
};

/** Public reader lookup — used by the /articles/:slug page that AI Overview
 * and search results citations link to. RLS restricts this to published rows
 * for anonymous/non-admin viewers automatically. */
export const getArticleBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Error fetching article by slug:', error);
    return { data: null, error };
  }

  return { data, error: null };
};

export const createArticle = async (article: CreateKnowledgeArticle) => {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .insert(article)
    .select()
    .single();

  if (error) {
    console.error('Error creating article:', error);
    throw error;
  }

  return { data, error: null };
};

export const updateArticle = async (id: string, updates: UpdateKnowledgeArticle) => {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating article:', error);
    throw error;
  }

  return { data, error: null };
};

export const deleteArticle = async (id: string) => {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting article:', error);
    throw error;
  }

  return { data, error: null };
};

