
import { GraduationCap, Sparkles, UserRound } from "lucide-react";
import { useMentorForm, MentorFormData } from "@/hooks/useMentorForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MentorProfileImageUpload from "./MentorProfileImageUpload";
import MentorAcademicInfo from "./form/MentorAcademicInfo";
import MentorPersonalInfo from "./form/MentorPersonalInfo";
import MentorSkillsField from "./form/MentorSkillsField";
import MentorBioField from "./form/MentorBioField";
import MentorLinkedInField from "./form/MentorLinkedInField";
import MentorFormActions from "./form/MentorFormActions";
import LinkedInPdfImport from "./form/LinkedInPdfImport";

interface MentorProfileFormProps {
  userId: string;
  initialData: MentorFormData;
  isEditMode?: boolean;
  pageTitle?: string;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * The form was previously one flat run of ten controls. Grouping them gives the
 * applicant a sense of how much is left and makes the progress meter meaningful.
 */
const Section = ({ icon, title, description, children }: SectionProps) => (
  <Card>
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2.5 text-lg">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">{children}</CardContent>
  </Card>
);

const MentorProfileForm = ({ userId, initialData, isEditMode = false }: MentorProfileFormProps) => {
  const {
    formData,
    isSubmitting,
    isDirty,
    errors,
    checkingCollegeId,
    completion,
    remainingRequired,
    handleChange,
    handleBlur,
    markTouched,
    handleImageUploaded,
    applyImportedData,
    handleSubmit
  } = useMentorForm(userId, initialData, isEditMode);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Sticky so the applicant can see the effect of filling a field without
          scrolling back to the top of a form that runs past one screen. */}
      <div className="sticky top-24 z-10 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            {isEditMode ? "Application progress" : "Your mentor profile"}
          </span>
          <span className="tabular-nums text-muted-foreground">{completion}%</span>
        </div>
        <Progress value={completion} className="h-2" />
      </div>

      <LinkedInPdfImport onImported={applyImportedData} />

      <Section
        icon={<UserRound className="h-4 w-4" />}
        title="About you"
        description="How you'll appear to students browsing for a mentor."
      >
        <MentorProfileImageUpload
          profileImage={formData.profile_image}
          name={formData.name}
          userId={userId}
          onImageUploaded={handleImageUploaded}
        />

        <MentorPersonalInfo
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleBlur={handleBlur}
          markTouched={markTouched}
        />
      </Section>

      <Section
        icon={<GraduationCap className="h-4 w-4" />}
        title="Academic background"
        description="Confirms you're a current SRM AP student. Your College ID and CGPA stay private."
      >
        <MentorAcademicInfo
          formData={formData}
          errors={errors}
          checkingCollegeId={checkingCollegeId}
          handleChange={handleChange}
          handleBlur={handleBlur}
          markTouched={markTouched}
        />
      </Section>

      <Section
        icon={<Sparkles className="h-4 w-4" />}
        title="What you can help with"
        description="The part students actually read when choosing a mentor."
      >
        <MentorSkillsField
          skills={formData.skills}
          error={errors.skills}
          handleChange={handleChange}
          handleBlur={handleBlur}
        />

        <MentorBioField
          bio={formData.bio}
          error={errors.bio}
          handleChange={handleChange}
          handleBlur={handleBlur}
        />

        <MentorLinkedInField
          linkedin_url={formData.linkedin_url}
          error={errors.linkedin_url}
          handleChange={handleChange}
          handleBlur={handleBlur}
        />
      </Section>

      <MentorFormActions
        isSubmitting={isSubmitting}
        isEditMode={isEditMode}
        isDirty={isDirty}
        remaining={remainingRequired}
      />
    </form>
  );
};

export default MentorProfileForm;
