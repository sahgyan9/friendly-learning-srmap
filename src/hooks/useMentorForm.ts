
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitMentorApplication } from "@/integrations/supabase/services/mentor-verification";
import { useNavigate } from "react-router-dom";

export interface MentorFormData {
  name: string;
  department: string;
  skills: string;
  bio: string;
  linkedin_url: string;
  profile_image: string;
  cgpa: string;
  year_of_studies: string;
  university: string;
  hobbies: string;
  other_departments: string;
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
      // Validate form
      if (!formData.name || !formData.department || !formData.skills.trim() || !formData.cgpa || !formData.year_of_studies || !formData.university) {
        throw new Error("Please fill in all required fields");
      }
      
      // Check if user already has a pending or approved application
      const { data: existingVerification } = await supabase
        .from('mentor_verifications')
        .select('status')
        .eq('user_id', userId)
        .single();
      
      if (existingVerification) {
        if (existingVerification.status === 'pending') {
          toast.error("You already have a pending mentor application. Please wait for admin review.");
          return;
        }
        if (existingVerification.status === 'approved') {
          toast.error("You are already an approved mentor.");
          return;
        }
      }
      
      // Submit verification application instead of directly creating mentor
      const applicationData = {
        user_id: userId,
        application_data: {
          name: formData.name,
          department: formData.department,
          skills: formData.skills,
          bio: formData.bio,
          linkedin_url: formData.linkedin_url,
          profile_image: formData.profile_image,
          cgpa: formData.cgpa,
          year_of_studies: formData.year_of_studies,
          university: formData.university,
          hobbies: formData.hobbies,
          other_departments: formData.other_departments
        },
        status: 'pending'
      };
      
      const { error } = await submitMentorApplication(applicationData);
      
      if (error) throw error;
      
      toast.success("Your mentor application has been submitted successfully! You will be notified once it's reviewed by our team.");
      
      // Navigate to the user's profile page
      navigate('/profile');
    } catch (error: any) {
      console.error("Error submitting mentor application:", error);
      toast.error(error.message || "Failed to submit mentor application");
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
