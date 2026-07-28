import type { MentorFormData } from "@/hooks/useMentorForm";

export type MentorFormErrors = Partial<Record<keyof MentorFormData, string>>;

/** Minimum bio length. A mentor card with a two-word bio tells a student nothing,
 *  and it was the most common reason applications came back rejected. */
export const BIO_MIN_LENGTH = 50;

/**
 * The order fields appear in the form. Submit focuses the first invalid field,
 * and that only feels right if "first" means first on screen rather than first
 * key in the object.
 */
export const FIELD_ORDER: (keyof MentorFormData)[] = [
  "name",
  "department",
  "mobile",
  "university",
  "year_of_studies",
  "cgpa",
  "hobbies",
  "skills",
  "bio",
  "linkedin_url",
];

export const FIELD_LABELS: Record<keyof MentorFormData, string> = {
  name: "Full name",
  department: "Department",
  mobile: "Mobile number",
  university: "University",
  year_of_studies: "Year of study",
  cgpa: "CGPA",
  hobbies: "Hobbies & interests",
  skills: "Skills",
  bio: "Bio",
  linkedin_url: "LinkedIn URL",
  profile_image: "Profile photo",
};

/** Splits the comma-separated skills field into trimmed, non-empty entries. */
export const parseSkills = (skills: string): string[] =>
  skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

/**
 * Indian mobile numbers: ten digits starting 6-9, optionally carrying a +91 or
 * 0 prefix. Anything else was previously accepted verbatim, so applications
 * arrived with placeholder text in the phone field and admins had no way to
 * reach the applicant.
 */
const validateMobile = (raw: string): string | undefined => {
  const digits = raw.replace(/\D/g, "");
  const national = digits.replace(/^(91|0)/, "");

  if (!national) return "Mobile number is required";
  if (national.length !== 10) return "Enter a 10-digit mobile number";
  if (!/^[6-9]/.test(national)) return "Indian mobile numbers start with 6, 7, 8 or 9";
  return undefined;
};

const validateLinkedIn = (raw: string): string | undefined => {
  const value = raw.trim();
  if (!value) return undefined; // optional

  let parsed: URL;
  try {
    parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return "Enter a full URL, e.g. https://linkedin.com/in/yourname";
  }

  if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) {
    return "That is not a LinkedIn URL";
  }
  if (parsed.pathname.replace(/\/+$/, "").length <= 1) {
    return "Link your profile, not linkedin.com itself";
  }
  return undefined;
};

/**
 * Validates the whole form and returns a message per invalid field.
 *
 * The form previously threw a single "Please fill in all required fields"
 * error, which named nothing — on a ten-field form spanning two screens the
 * applicant had to hunt for what was missing.
 */
export function validateMentorForm(data: MentorFormData): MentorFormErrors {
  const errors: MentorFormErrors = {};

  if (!data.name?.trim()) {
    errors.name = "Full name is required";
  } else if (data.name.trim().length < 2) {
    errors.name = "Enter your full name";
  }

  if (!data.department?.trim()) errors.department = "Select your department";

  const mobileError = validateMobile(data.mobile ?? "");
  if (mobileError) errors.mobile = mobileError;

  if (!data.university?.trim()) errors.university = "University is required";

  if (!data.year_of_studies) errors.year_of_studies = "Select your year of study";

  const cgpaRaw = (data.cgpa ?? "").toString().trim();
  if (!cgpaRaw) {
    errors.cgpa = "CGPA is required";
  } else {
    const cgpa = Number.parseFloat(cgpaRaw);
    if (Number.isNaN(cgpa)) errors.cgpa = "Enter your CGPA as a number";
    else if (cgpa < 0 || cgpa > 10) errors.cgpa = "CGPA must be between 0 and 10";
  }

  const skills = parseSkills(data.skills ?? "");
  if (skills.length === 0) {
    errors.skills = "Add at least one skill";
  } else if (skills.length < 2) {
    errors.skills = "Add at least two skills, separated by commas";
  }

  const bio = (data.bio ?? "").trim();
  if (!bio) {
    errors.bio = "A short bio is required — it is the first thing students read";
  } else if (bio.length < BIO_MIN_LENGTH) {
    errors.bio = `${BIO_MIN_LENGTH - bio.length} more characters needed`;
  }

  const linkedInError = validateLinkedIn(data.linkedin_url ?? "");
  if (linkedInError) errors.linkedin_url = linkedInError;

  return errors;
}

/** First invalid field in on-screen order, for focus and scroll on submit. */
export function firstInvalidField(errors: MentorFormErrors): keyof MentorFormData | undefined {
  return FIELD_ORDER.find((field) => errors[field]);
}
