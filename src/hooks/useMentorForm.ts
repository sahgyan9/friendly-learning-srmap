
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addMentor } from "@/integrations/supabase/services/mentors";
import { useNavigate } from "react-router-dom";

export interface MentorFormData {
  name: string;
  department: string;
  skills: string;
  bio: string;
  linkedin_url: string;
  profile_image: string;
}

export const useMentorForm = (userId: string, initialData: MentorFormData) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MentorFormData>(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      profile_image: imageUrl
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error("You must be logged in to become a mentor");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert skills string to array
      const skillsArray = formData.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
      
      // Validate form
      if (!formData.name || !formData.department || skillsArray.length === 0) {
        throw new Error("Please fill in all required fields");
      }
      
      const mentorData = {
        id: userId,
        name: formData.name,
        department: formData.department,
        skills: skillsArray,
        bio: formData.bio || null,
        linkedin_url: formData.linkedin_url || null,
        profile_image: formData.profile_image,
        rating: 4.0,
        review_count: 0
      };
      
      // First, update the user's role to 'mentor' in the users table
      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'mentor' })
        .eq('id', userId);
      
      if (userError) throw userError;
      
      // Then add the mentor record
      const { error } = await addMentor(mentorData);
      
      if (error) throw error;
      
      toast.success("Your mentor profile has been created successfully!");
      
      // Navigate to the user's profile page
      navigate('/profile');
    } catch (error: any) {
      console.error("Error creating mentor profile:", error);
      toast.error(error.message || "Failed to create mentor profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    isSubmitting,
    handleChange,
    handleImageUploaded,
    handleSubmit
  };
};
