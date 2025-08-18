
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
      if (!formData.name || !formData.department || !formData.skills.trim() || !formData.cgpa || !formData.year_of_studies || !formData.university || !formData.mobile) {
        throw new Error("Please fill in all required fields");
      }

      const applicationData = {
        user_id: userId,
        application_data: {
          name: formData.name,
          department: formData.department,
          skills: formData.skills,
          bio: formData.bio,
          linkedin_url: formData.linkedin_url,
          profile_image: formData.profile_image,
          mobile: formData.mobile
        },
        cgpa: parseFloat(formData.cgpa),
        year_of_studies: formData.year_of_studies,
        university: formData.university,
        hobbies: formData.hobbies,
        status: 'pending'
      };

      if (isEditMode) {
        // Update existing rejected application
        try {
          const { error } = await updateMentorApplication(userId, applicationData);

          if (error) throw error;

          toast.success("Your mentor application has been updated and resubmitted successfully! You will be notified once it's reviewed by our team.");
        } catch (updateError: any) {
          console.error("Error updating mentor application:", updateError);
          throw new Error(updateError.message || "Failed to update mentor application");
        }
      } else {
        // Check if user already has any application (prevent duplicates)
        try {
          const { data: existingVerification, error: checkError } = await getMentorVerification(userId);

          if (checkError) {
            console.error("Error checking existing verification:", checkError);
            throw new Error("Failed to check existing application status");
          }

          if (existingVerification) {
            if (existingVerification.status === 'pending') {
              toast.error("You already have a pending mentor application. Please wait for admin review.");
              // Redirect to status page
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
        } catch (checkError: any) {
          console.error("Error checking existing application:", checkError);
          throw new Error(checkError.message || "Failed to check application status");
        }

        // Submit new application
        try {
          const { error } = await submitMentorApplication(applicationData);

          if (error) throw error;

          toast.success("Your mentor application has been submitted successfully! You will be notified once it's reviewed by our team.");
        } catch (submitError: any) {
          console.error("Error submitting mentor application:", submitError);
          throw new Error(submitError.message || "Failed to submit mentor application");
        }
      }

      // Navigate to status page instead of profile
      navigate('/become-mentor');
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
