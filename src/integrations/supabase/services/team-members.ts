
import { supabase } from '@/integrations/supabase/client';
import { downscaleImage } from '@/lib/image/downscale';
import { storagePathFromPublicUrl } from '@/lib/image/storage-path';
import { IMAGE_UPLOAD_CACHE_CONTROL } from '@/lib/constants';

export type TeamMember = {
  id: string;
  name: string;
  position: string;
  email?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getTeamMembers() {
  // Check if user is admin to determine which data to return
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    
    if (userData?.is_admin) {
      // Admin can see all data including emails
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');
      return { data, error };
    }
  }
  
  // Public users get filtered data (no emails)
  const { data, error } = await supabase
    .rpc('get_team_members_public');
  
  return { data, error };
}

export async function getTeamMemberById(id: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  return { data, error };
}

export async function createTeamMember(teamMember: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('team_members')
    .insert([teamMember])
    .select('*')
    .maybeSingle();
  
  return { data, error };
}

export async function updateTeamMember(id: string, updates: Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>) {
  let previousImageUrl: string | undefined;
  if (updates.image_url !== undefined) {
    const { data: existing } = await supabase
      .from('team_members')
      .select('image_url')
      .eq('id', id)
      .maybeSingle();
    previousImageUrl = existing?.image_url;
  }

  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (!error && previousImageUrl && previousImageUrl !== updates.image_url) {
    await removeTeamMemberImageIfOwned(previousImageUrl);
  }

  return { data, error };
}

export async function deleteTeamMember(id: string) {
  const { data: existing } = await supabase
    .from('team_members')
    .select('image_url')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) return { error };

  // Deliberately after the row delete succeeds — a failed storage removal
  // leaves a harmless orphaned file, deleting the image first risks stranding
  // the row with a broken image if the row delete then fails.
  if (existing?.image_url) {
    await removeTeamMemberImageIfOwned(existing.image_url);
  }

  return { error: null };
}

async function removeTeamMemberImageIfOwned(imageUrl: string) {
  const path = storagePathFromPublicUrl('team_members', imageUrl);
  if (!path) return;
  const { error } = await deleteTeamMemberImage(path);
  if (error) console.error('Error removing team member image:', error);
}

export async function uploadTeamMemberImage(original: File) {
  // Shown as a small round portrait on the About page; a full-size phone photo
  // is several megabytes to draw a thumbnail.
  const file = await downscaleImage(original);

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('team_members')
    .upload(filePath, file, { cacheControl: IMAGE_UPLOAD_CACHE_CONTROL });
  
  if (error) {
    return { data: null, error };
  }
  
  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('team_members')
    .getPublicUrl(filePath);
  
  return { data: { path: filePath, url: publicUrl }, error: null };
}

export async function deleteTeamMemberImage(path: string) {
  const { error } = await supabase.storage
    .from('team_members')
    .remove([path]);
  
  return { error };
}
