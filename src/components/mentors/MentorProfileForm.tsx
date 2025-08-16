
import { Link } from "react-router-dom";
import { useMentorForm, MentorFormData } from "@/hooks/useMentorForm";
import MentorProfileImageUpload from "./MentorProfileImageUpload";
import MentorAcademicInfo from "./form/MentorAcademicInfo";
import MentorPersonalInfo from "./form/MentorPersonalInfo";
import MentorSkillsField from "./form/MentorSkillsField";
import MentorBioField from "./form/MentorBioField";
import MentorLinkedInField from "./form/MentorLinkedInField";
import MentorFormActions from "./form/MentorFormActions";

interface MentorProfileFormProps {
  userId: string;
  initialData: MentorFormData;
  isEditMode?: boolean;
  pageTitle?: string;
}

const MentorProfileForm = ({ userId, initialData, isEditMode = false, pageTitle }: MentorProfileFormProps) => {
  const { 
    formData, 
    isSubmitting, 
    handleChange, 
    handleImageUploaded, 
    handleSubmit 
  } = useMentorForm(userId, initialData, isEditMode);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <MentorProfileImageUpload 
        profileImage={formData.profile_image}
        name={formData.name}
        userId={userId}
        onImageUploaded={handleImageUploaded}
      />

      <MentorPersonalInfo 
        formData={formData}
        handleChange={handleChange}
      />

      <MentorAcademicInfo 
        formData={formData}
        handleChange={handleChange}
      />

      <MentorSkillsField 
        skills={formData.skills}
        handleChange={handleChange}
      />

      <MentorBioField 
        bio={formData.bio}
        handleChange={handleChange}
      />

      <MentorLinkedInField 
        linkedin_url={formData.linkedin_url}
        handleChange={handleChange}
      />

      <MentorFormActions isSubmitting={isSubmitting} isEditMode={isEditMode} />
    </form>
  );
};

export default MentorProfileForm;
