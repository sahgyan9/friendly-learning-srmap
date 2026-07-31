
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  submitMentorApplication,
  updateMentorApplication,
  getMentorVerification,
  isCollegeIdTaken
} from "@/integrations/supabase/services/mentor-verification";
import { useNavigate } from "react-router-dom";
import {
  FIELD_LABELS,
  firstInvalidField,
  parseSkills,
  validateMentorForm,
  type MentorFormErrors,
} from "@/lib/mentor-form-validation";
import { COLLEGE_ID_PATTERN, normaliseCollegeId, suggestedGraduationYear } from "@/lib/college-id";
import { createNotification } from "@/integrations/supabase/services/notifications";
import { MIN_STUDENTS_FOR_CERTIFICATE } from "@/lib/certificate";

export interface MentorFormData {
  name: string;
  department: string;
  skills: string;
  bio: string;
  linkedin_url: string;
  profile_image: string;
  cgpa: string;
  year_of_studies: string;
  college_id: string;
  graduation_year: string;
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
  "college_id",
  "year_of_studies",
  "graduation_year",
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

  /**
   * Duplicate College IDs can only be detected server-side — RLS hides other
   * users' rows from the browser — so this is checked asynchronously rather than
   * in validateMentorForm with everything else.
   */
  const [collegeIdTaken, setCollegeIdTaken] = useState(false);
  const [checkingCollegeId, setCheckingCollegeId] = useState(false);

  const normalisedCollegeId = normaliseCollegeId(formData.college_id);
  const collegeIdWellFormed = COLLEGE_ID_PATTERN.test(normalisedCollegeId);

  useEffect(() => {
    if (!collegeIdWellFormed) {
      setCollegeIdTaken(false);
      setCheckingCollegeId(false);
      return;
    }

    // Debounced so typing an ID is one lookup, not thirteen.
    let active = true;
    setCheckingCollegeId(true);
    const timer = setTimeout(async () => {
      const taken = await isCollegeIdTaken(normalisedCollegeId);
      if (!active) return;
      setCollegeIdTaken(taken);
      setCheckingCollegeId(false);
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [normalisedCollegeId, collegeIdWellFormed]);

  const allErrors = useMemo(() => {
    const errors = validateMentorForm(formData);

    // Only when the format is already good, so one mistake reports one problem.
    if (collegeIdTaken && !errors.college_id) {
      errors.college_id =
        "That College ID is already registered to another account. Check the digits, or contact us if someone else has used your ID.";
    }

    return errors;
  }, [formData, collegeIdTaken]);

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

  /**
   * Set once the applicant picks their own graduation year, after which the
   * College ID stops suggesting one. Without this, correcting a typo in the ID
   * would silently overwrite a year they had deliberately chosen.
   */
  const graduationYearChosen = useRef(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setIsDirty(true);

      if (name === "graduation_year") graduationYearChosen.current = true;

      setFormData(prev => {
        const next = { ...prev, [name]: value };

        // The ID encodes the enrollment year, so we can offer a graduation year
        // rather than asking for it cold. It is only ever a suggestion: course
        // lengths differ, so the applicant confirms or corrects it.
        if (name === "college_id" && !graduationYearChosen.current) {
          const suggestion = suggestedGraduationYear(value);
          next.graduation_year = suggestion === null ? "" : String(suggestion);
        }

        return next;
      });
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

  /**
   * Used when a step is left via Next. Pressing Next is the same promise as
   * pressing Submit for that slice of the form, so every field on the step earns
   * the right to show its error at once — otherwise Next would refuse to advance
   * while pointing at nothing.
   */
  const markManyTouched = useCallback((fields: (keyof MentorFormData)[]) => {
    setTouched(prev => {
      const next = new Set(prev);
      for (const field of fields) next.add(field);
      return next;
    });
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

    // The debounced check may not have landed yet, so confirm before submitting
    // rather than relying on whatever the last keystroke happened to resolve.
    if (collegeIdWellFormed && (await isCollegeIdTaken(normalisedCollegeId))) {
      setCollegeIdTaken(true);
      setIsSubmitting(false);
      toast.error("That College ID is already registered to another account");
      const node = document.getElementById("college_id");
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
      node?.focus({ preventScroll: true });
      return;
    }

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
        college_id: normaliseCollegeId(formData.college_id),
        graduation_year: Number.parseInt(formData.graduation_year, 10),
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

        // Email delivery is not live yet, so promising mail was a promise the
        // platform could not keep. The notification bell can.
        toast.success("Resubmitted — we'll let you know once it's been reviewed.");
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

        // Approved by the insert trigger before this line runs, so say so — and
        // say it here rather than on the button that opens the form, which is
        // where it would have been a claim with no row behind it.
        toast.success("You're a mentor 🎉", {
          description:
            "Your profile is live. Students looking for help in your department can find and message you now.",
          duration: 8000,
        });

        // The toast is gone in eight seconds. This is the copy of it they can
        // come back to, and it points at the certificate page, which shows how
        // many students are left before theirs is issued.
        try {
          await createNotification({
            user_id: userId,
            type: "system",
            title: "You're a mentor 🎉",
            content: `Your profile is live and students can message you. Help ${MIN_STUDENTS_FOR_CERTIFICATE} of them through a real conversation and you earn your certificate.`,
            data: { mentor_welcome: true },
          });
        } catch {
          // A missing bell entry is not worth failing a successful signup over.
        }
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
    /** Every error, whether or not it has been earned yet — the stepper asks
     *  "is this step actually complete?", which is not the same question as
     *  "what may this applicant be shown?". */
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
  };
};
