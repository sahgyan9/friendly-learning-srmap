
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { uploadProfileImage } from "@/components/profile/ImageUploadService";

interface ProfileFormData {
  name: string;
  email: string;
  profile_image: string;
  bio: string;
  department: string;
  skills: string;
  linkedin_url: string;
}

export const useProfileForm = () => {
  const { user, profile, loading: authLoading, refreshProfile, isMentor } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMentorProfile, setIsMentorProfile] = useState(false);
  const [mentorData, setMentorData] = useState<any>(null);
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    profile_image: "",
    bio: "",
    department: "",
    skills: "",
    linkedin_url: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      console.log("Setting form data from profile:", profile);
      setFormData(prev => ({
        ...prev,
        name: profile.name || "",
        email: profile.email || "",
        profile_image: profile.profile_image || ""
      }));

      // Check if the user is a mentor
      if (isMentor) {
        checkMentorStatus();
      }
    }
  }, [profile, isMentor]);

  const checkMentorStatus = async () => {
    if (!user) return;
    
    try {
      console.log("Checking mentor status for:", user.id);
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error checking mentor status:', error);
        }
        setIsMentorProfile(false);
        return;
      }
      
      if (data) {
        console.log("Mentor data found:", data);
        setIsMentorProfile(true);
        setMentorData(data);
        // Update form with mentor data
        setFormData(prev => ({
          ...prev,
          bio: data.bio || "",
          department: data.department || "",
          skills: data.skills?.join(', ') || "",
          linkedin_url: data.linkedin_url || "",
          profile_image: data.profile_image || prev.profile_image
        }));
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefreshProfile = async () => {
    toast.info("Refreshing profile data...");
    await refreshProfile();
    toast.success("Profile data refreshed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload image if changed
      let profileImageUrl = formData.profile_image;
      if (imageFile) {
        const uploadedUrl = await uploadProfileImage(imageFile, user.id);
        if (uploadedUrl) {
          profileImageUrl = uploadedUrl;
        }
      }
      
      console.log("Updating user profile with data:", {
        name: formData.name,
        profile_image: profileImageUrl
      });
      
      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          profile_image: profileImageUrl
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // If mentor, update mentor profile as well
      if (isMentorProfile) {
        const skillsArray = formData.skills
          .split(',')
          .map(skill => skill.trim())
          .filter(skill => skill.length > 0);
        
        console.log("Updating mentor profile with data:", {
          name: formData.name,
          bio: formData.bio,
          department: formData.department,
          skills: skillsArray,
          linkedin_url: formData.linkedin_url,
          profile_image: profileImageUrl
        });
        
        const { error: mentorError } = await supabase
          .from('mentors')
          .update({
            name: formData.name,
            bio: formData.bio,
            department: formData.department,
            skills: skillsArray,
            linkedin_url: formData.linkedin_url,
            profile_image: profileImageUrl
          })
          .eq('id', user.id);
        
        if (mentorError) throw mentorError;
      }
      
      toast.success('Profile updated successfully');
      
      // Refresh the profile to show updated data
      await refreshProfile();
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    profile,
    formData,
    isLoading,
    authLoading,
    isMentorProfile,
    isMentor,
    previewUrl,
    handleChange,
    handleImageChange,
    handleRefreshProfile,
    handleSubmit
  };
};
