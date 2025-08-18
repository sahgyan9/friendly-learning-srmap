
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  submitMentorApplication,
  updateMentorApplication,
  getMentorVerification
} from "@/integrations/supabase/services/mentor-verification";
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
  mobile: string;
}

export const useMentorForm = (userId: string, initialData: MentorFormData, isEditMode = false) => {
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
      if (!formData.name?.trim() || !formData.department?.trim() || !formData.skills.trim() || !formData.cgpa || !formData.year_of_studies || !formData.university?.trim() || !formData.mobile?.trim()) {
        throw new Error("Please fill in all required fields");
      }

      // Validate CGPA
      const cgpaNum = parseFloat(formData.cgpa);
      if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
        throw new Error("Please enter a valid CGPA between 0 and 10");
      }

      const applicationData = {
        user_id: userId,
        application_data: {
          name: formData.name.trim(),
          department: formData.department.trim(),
          skills: formData.skills.trim(),
          bio: formData.bio?.trim() || '',
          linkedin_url: formData.linkedin_url?.trim() || '',
          profile_image: formData.profile_image || '',
          mobile: formData.mobile.trim()
        },
        cgpa: cgpaNum,
        year_of_studies: formData.year_of_studies,
        university: formData.university.trim(),
        hobbies: formData.hobbies?.trim() || '',
        status: 'pending'
      };

      console.log('Submitting application data:', applicationData);

      if (isEditMode) {
        // Update existing rejected application
        const result = await updateMentorApplication(userId, applicationData);
        
        if (result.error) {
          console.error("Update error:", result.error);
          throw new Error(result.error.message || "Failed to update mentor application");
        }

        toast.success("Your mentor application has been updated and resubmitted successfully! You will be notified once it's reviewed by our team.");
      } else {
        // Check if user already has any application (prevent duplicates)
        const { data: existingVerification, error: checkError } = await getMentorVerification(userId);

        if (checkError && checkError.message !== 'User ID is required') {
          console.error("Error checking existing verification:", checkError);
          throw new Error("Failed to check existing application status");
        }

        if (existingVerification) {
          if (existingVerification.status === 'pending') {
            toast.error("You already have a pending mentor application. Please wait for admin review.");
            navigate('/become-mentor');
            return;
          }
          if (existingVerification.status === 'approved') {
            toast.error("You are already an approved mentor.");
            navigate('/become-mentor');
            return;
          }
          if (existingVerification.status === 'rejected') {
            toast.error("You have a rejected application. Please use the edit option to update and resubmit it.");
            navigate('/become-mentor?edit=true');
            return;
          }
        }

        // Submit new application
        const result = await submitMentorApplication(applicationData);
        
        if (result.error) {
          console.error("Submit error:", result.error);
          throw new Error(result.error.message || "Failed to submit mentor application");
        }

        toast.success("Your mentor application has been submitted successfully! You will be notified once it's reviewed by our team.");
      }

      // Navigate to status page
      navigate('/become-mentor');
    } catch (error: any) {
      console.error("Error handling mentor application:", error);
      toast.error(error.message || "Failed to process mentor application");
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
