
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, GraduationCap, Sparkles, UserRound } from "lucide-react";
import { useMentorForm, MentorFormData } from "@/hooks/useMentorForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FIELD_LABELS } from "@/lib/mentor-form-validation";
import MentorProfileImageUpload from "./MentorProfileImageUpload";
import MentorAcademicInfo from "./form/MentorAcademicInfo";
import MentorPersonalInfo from "./form/MentorPersonalInfo";
import MentorSkillsField from "./form/MentorSkillsField";
import MentorBioField from "./form/MentorBioField";
import MentorLinkedInField from "./form/MentorLinkedInField";
import MentorFormActions from "./form/MentorFormActions";
import MentorFormCancel from "./form/MentorFormCancel";
import ResumePdfImport from "./form/ResumePdfImport";

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

/**
 * Which fields belong to which step, in on-screen order.
 *
 * Ten required fields visible in one scroll was the thing people bounced off,
 * and a third of them are free — name and university arrive prefilled, and the
 * graduation year is derived from the College ID. Four at a time makes the real
 * size of the job visible.
 */
const STEP_FIELDS: (keyof MentorFormData)[][] = [
  ["name", "department", "mobile"],
  ["university", "college_id", "year_of_studies", "graduation_year", "cgpa", "hobbies"],
  ["skills", "bio", "linkedin_url"],
];

const STEP_LABELS = ["About you", "Your studies", "How you can help"];

const MentorProfileForm = ({ userId, initialData, isEditMode = false }: MentorProfileFormProps) => {
  const {
    formData,
    isSubmitting,
    isDirty,
    errors,
    allErrors,
    checkingCollegeId,
    completion,
    remainingRequired,
    handleChange,
    handleBlur,
    markTouched,
    markManyTouched,
    handleImageUploaded,
    applyImportedData,
    handleSubmit
  } = useMentorForm(userId, initialData, isEditMode);

  /**
   * Only new applicants are stepped. Someone resubmitting after a rejection is
   * re-reading the whole thing against admin feedback, and hiding two thirds of
   * their own answers behind Next would make that harder, not easier.
   */
  const stepped = !isEditMode;
  const [step, setStep] = useState(0);
  const isLastStep = !stepped || step === STEP_FIELDS.length - 1;

  const goToStep = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const fields = STEP_FIELDS[step];

    // Pressing Next is the same promise as pressing Submit for this slice, so
    // the whole step earns its error messages at once — otherwise Next would
    // refuse to move while the page showed nothing wrong.
    markManyTouched(fields);

    const bad = fields.filter((field) => allErrors[field]);
    if (bad.length > 0) {
      const first = bad[0];
      toast.error(
        bad.length === 1
          ? `${FIELD_LABELS[first]}: ${allErrors[first]}`
          : `${bad.length} fields need attention — starting with ${FIELD_LABELS[first]}`,
      );

      const node = document.getElementById(first);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      node?.focus({ preventScroll: true });
      return;
    }

    goToStep(step + 1);
  };

  /** Enter inside a field submits the form, so a mid-form Enter must advance. */
  const onFormSubmit = (event: React.FormEvent) => {
    if (!isLastStep) {
      event.preventDefault();
      goNext();
      return;
    }
    handleSubmit(event);
  };

  const showSection = (index: number) => !stepped || step === index;

  const backButton = stepped && step > 0 && (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      disabled={isSubmitting}
      onClick={() => goToStep(step - 1)}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  );

  return (
    <form onSubmit={onFormSubmit} className="space-y-6" noValidate>
      {/* Sticky so the applicant can see the effect of filling a field without
          scrolling back to the top of a form that runs past one screen. */}
      <div className="sticky top-24 z-10 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-medium">
            {stepped
              ? `Step ${step + 1} of ${STEP_FIELDS.length} — ${STEP_LABELS[step]}`
              : "Application progress"}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{completion}%</span>
        </div>
        <Progress value={completion} className="h-2" />
      </div>

      {showSection(0) && (
        <>
          <ResumePdfImport onImported={applyImportedData} fields="basic" />

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
        </>
      )}

      {showSection(1) && (
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
      )}

      {showSection(2) && (
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
      )}

      {isLastStep ? (
        <MentorFormActions
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
          isDirty={isDirty}
          remaining={remainingRequired}
          backButton={backButton || undefined}
        />
      ) : (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            {backButton || <MentorFormCancel isSubmitting={isSubmitting} isDirty={isDirty} />}
            <Button type="button" size="lg" onClick={goNext} className="sm:min-w-52">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground sm:text-right">
            Nothing is published until the last step, and you can edit it all afterwards.
          </p>
        </div>
      )}
    </form>
  );
};

export default MentorProfileForm;
