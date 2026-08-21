import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type CampusNotice = Database['public']['Tables']['campus_notices']['Row'];
export type CreateCampusNotice = Database['public']['Tables']['campus_notices']['Insert'];
export type UpdateCampusNotice = Database['public']['Tables']['campus_notices']['Update'];

export const getNotices = async () => {
  const { data, error } = await supabase
    .from('campus_notices')
    .select('*')
    .order('issued_date', { ascending: false });

  if (error) {
    console.error('Error fetching notices:', error);
    throw error;
  }

  return { data, error: null };
};

export const createNotice = async (notice: CreateCampusNotice) => {
  const { data, error } = await supabase
    .from('campus_notices')
    .insert(notice)
    .select()
    .single();

  if (error) {
    console.error('Error creating notice:', error);
    throw error;
  }

  return { data, error: null };
};

export const updateNotice = async (id: string, updates: UpdateCampusNotice) => {
  const { data, error } = await supabase
    .from('campus_notices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating notice:', error);
    throw error;
  }

  return { data, error: null };
};

export const deleteNotice = async (id: string) => {
  const { data, error } = await supabase
    .from('campus_notices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting notice:', error);
    throw error;
  }

  return { data, error: null };
};

export interface ParsedNotice {
  model: string;
  title: string;
  category: string;
  reference_no: string;
  issued_date: string;
  effective_date: string;
  summary: string;
  content: string;
}

export const parseNoticeFromText = async (text: string) => {
  const { data, error } = await supabase.functions.invoke<ParsedNotice>('parse-notice', {
    body: { mode: 'text', text },
  });

  if (error) {
    console.error('Error parsing notice text:', error);
    throw error;
  }

  return data as ParsedNotice;
};

export const parseNoticeFromImage = async (imageBase64: string, mimeType: string) => {
  const { data, error } = await supabase.functions.invoke<ParsedNotice>('parse-notice', {
    body: { mode: 'image', imageBase64, mimeType },
  });

  if (error) {
    console.error('Error parsing notice image:', error);
    throw error;
  }

  return data as ParsedNotice;
};

/** Best-effort: speeds up when the new notice becomes searchable in /ask, but
 * the hourly embed-knowledge cron will pick it up regardless if this fails. */
export const triggerEmbedding = async () => {
  try {
    await supabase.functions.invoke('embed-knowledge');
  } catch (error) {
    console.error('Best-effort embed-knowledge trigger failed (cron will catch up):', error);
  }
};
