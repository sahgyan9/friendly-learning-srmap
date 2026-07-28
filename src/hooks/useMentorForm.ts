
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  submitMentorApplication,
  updateMentorApplication,
  getMentorVerification
} from "@/integrations/supabase/services/mentor-verification";
import { useNavigate } from "react-router-dom";
import {
  FIELD_LABELS,
  firstInvalidField,
  parseSkills,
  validateMentorForm,
  type MentorFormErrors,
} from "@/lib/mentor-form-validation";

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

/** Fields that count toward the completion meter, in the order they appear. */
const PROGRESS_FIELDS: (keyof MentorFormData)[] = [
  "name",
  "department",
  "mobile",
  "university",
  "year_of_studies",
  "cgpa",
  "skills",
  "bio",
];

export const useMentorForm = (userId: string, initialData: MentorFormData, isEditMode = false) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MentorFormData>(initialData);
  const [touched, setTouched] = useState<Set<keyof MentorFormData>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const allErrors = useMemo(() => validateMentorForm(formData), [formData]);

  /**
   * Errors are only surfaced once a field has been left, or once submit has been
   * pressed. Validating as the user types the first character of their name
   * would paint the form red before they had a chance to fill anything in.
   */
  const visibleErrors = useMemo(() => {
    if (submitAttempted) return allErrors;
    const visible: MentorFormErrors = {};
    for (const field of touched) {
      if (allErrors[field]) visible[field] = allErrors[field];
    }
    return visible;
  }, [allErrors, touched, submitAttempted]);

  const completion = useMemo(() => {
    const done = PROGRESS_FIELDS.filter((field) => !allErrors[field]).length;
    return Math.round((done / PROGRESS_FIELDS.length) * 100);
  }, [allErrors]);

  /**
   * Counted from every error, not just the visible ones — the footer reports
   * what is genuinely left to do, which is not the same question as which
   * messages the applicant has earned the right to see yet.
   */
  const remainingRequired = useMemo(() => Object.keys(allErrors).length, [allErrors]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setIsDirty(true);
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    },
    [],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const field = e.target.name as keyof MentorFormData;
      if (field) setTouched(prev => new Set(prev).add(field));
    },
    [],
  );

  /** Selects fire no blur event, so they mark themselves touched on change. */
  const markTouched = useCallback((field: keyof MentorFormData) => {
    setTouched(prev => new Set(prev).add(field));
  }, []);

  const handleImageUploaded = useCallback((imageUrl: string) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      profile_image: imageUrl
    }));
  }, []);

  const applyImportedData = useCallback((imported: Partial<MentorFormData>) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, ...imported }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!userId) {
      toast.error("You must be logged in to become a mentor");
      return;
    }

    const errors = validateMentorForm(formData);
    const firstBad = firstInvalidField(errors);

    if (firstBad) {
      const count = Object.keys(errors).length;
      toast.error(
        count === 1
          ? `${FIELD_LABELS[firstBad]}: ${errors[firstBad]}`
          : `${count} fields need attention — starting with ${FIELD_LABELS[firstBad]}`,
      );

      // Take the applicant to the problem rather than making them hunt for it.
      const node = document.getElementById(firstBad);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      node?.focus({ preventScroll: true });
      return;
    }

    setIsSubmitting(true);

    try {
      const applicationData = {
        user_id: userId,
        application_data: {
          name: formData.name.trim(),
          department: formData.department.trim(),
          skills: parseSkills(formData.skills).join(", "),
          bio: formData.bio?.trim() || '',
          linkedin_url: formData.linkedin_url?.trim() || '',
          profile_image: formData.profile_image || '',
          mobile: formData.mobile.trim()
        },
        cgpa: Number.parseFloat(formData.cgpa),
        year_of_studies: formData.year_of_studies,
        university: formData.university.trim(),
        hobbies: formData.hobbies?.trim() || '',
        status: 'pending'
      };

      if (isEditMode) {
        // Update existing rejected application
        const result = await updateMentorApplication(userId, applicationData);

        if (result.error) {
          throw new Error(result.error.message || "Failed to update mentor application");
        }

        toast.success("Application resubmitted — we'll email you once it's reviewed.");
      } else {
        // Check if user already has any application (prevent duplicates)
        const { data: existingVerification, error: checkError } = await getMentorVerification(userId);

        if (checkError && checkError.message !== 'User ID is required') {
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
          throw new Error(result.error.message || "Failed to submit mentor application");
        }

        toast.success("Application submitted — we'll email you once it's reviewed.");
      }

      setIsDirty(false);

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
    isDirty,
    errors: visibleErrors,
    completion,
    remainingRequired,
    handleChange,
    handleBlur,
    markTouched,
    handleImageUploaded,
    applyImportedData,
    handleSubmit
  };
};
