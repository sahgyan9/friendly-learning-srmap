
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addMentor } from "@/integrations/supabase/services/mentors";
import MentorProfileImageUpload from "./MentorProfileImageUpload";
import { useAuth } from "@/context/AuthContext";

// Import new component sections
import MentorPersonalInfoSection from "./form/MentorPersonalInfoSection";
import MentorSkillsSection from "./form/MentorSkillsSection";
import MentorBioSection from "./form/MentorBioSection";
import MentorLinkedInSection from "./form/MentorLinkedInSection";
import MentorFormActions from "./form/MentorFormActions";

export interface MentorFormData {
  name: string;
  department: string;
  skills: string;
  bio: string;
  linkedin_url: string;
  profile_image: string;
}

interface MentorProfileFormProps {
  userId: string;
  initialData: MentorFormData;
}

const MentorProfileForm = ({ userId, initialData }: MentorProfileFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MentorFormData>(initialData);
  const { refreshProfile } = useAuth();

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
      console.log("Submitting mentor application:", formData);
      
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
      
      console.log("Creating mentor with data:", mentorData);
      
      // First, update the user's role to 'mentor' in the users table
      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'mentor' })
        .eq('id', userId);
      
      if (userError) {
        console.error("Error updating user role:", userError);
        throw userError;
      }
      
      // Then add the mentor record
      const { error } = await addMentor(mentorData);
      
      if (error) {
        console.error("Error adding mentor:", error);
        throw error;
      }
      
      toast.success("Your mentor profile has been created successfully!");
      
      // Refresh the auth context to update role information
      await refreshProfile();
      
      // Navigate to the user's profile page
      navigate('/profile');
    } catch (error: any) {
      console.error("Error creating mentor profile:", error);
      toast.error(error.message || "Failed to create mentor profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <MentorProfileImageUpload 
        profileImage={formData.profile_image}
        name={formData.name}
        userId={userId}
        onImageUploaded={handleImageUploaded}
      />

      <MentorPersonalInfoSection formData={formData} handleChange={handleChange} />
      
      <MentorSkillsSection formData={formData} handleChange={handleChange} />
      
      <MentorBioSection formData={formData} handleChange={handleChange} />
      
      <MentorLinkedInSection formData={formData} handleChange={handleChange} />

      <MentorFormActions isSubmitting={isSubmitting} />
    </form>
  );
};

export default MentorProfileForm;
