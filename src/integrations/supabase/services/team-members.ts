
import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  
  return { data, error };
}

export async function deleteTeamMember(id: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);
  
  return { error };
}

export async function uploadTeamMemberImage(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('team_members')
    .upload(filePath, file);
  
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
