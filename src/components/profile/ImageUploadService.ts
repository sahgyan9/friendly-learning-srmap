
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadProfileImage = async (imageFile: File, userId: string): Promise<string | null> => {
  if (!imageFile || !userId) return null;
  
  const fileExt = imageFile.name.split('.').pop();
  const filePath = `profile-images/${userId}-${Date.now()}.${fileExt}`;
  
  try {
    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, imageFile);
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    toast.error('Failed to upload image');
    return null;
  }
};
