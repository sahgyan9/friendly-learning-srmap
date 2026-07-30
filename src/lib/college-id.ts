/**
 * SRM AP enrollment numbers, e.g. AP23111260062.
 *
 * The format is "AP" followed by 11 digits, where digits 3-4 are the enrollment
 * year: AP23... enrolled in 2023.
 *
 * It is worth being precise about what this does and does not prove. The format
 * check catches typos, not fabrications — "AP" plus eleven digits is trivial to
 * invent. What the ID buys with no human involved is two things: a
 * one-account-per-person key (enforced by the unique index on
 * users.college_id), and a cross-check against the graduation year an applicant
 * claims. Anything stronger needs a person to look, which is what the flag
 * queue on the admin page is for.
 */

export const COLLEGE_ID_PATTERN = /^AP\d{11}$/;

/** Enrollment numbers get copied off ID cards, so spaces and case are noise. */
export function normaliseCollegeId(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

export function validateCollegeId(raw: string): string | undefined {
  const value = normaliseCollegeId(raw ?? "");

  if (!value) return "College ID is required";
  if (!/^AP/.test(value)) return "SRM AP IDs start with AP, e.g. AP23111260062";
  if (!COLLEGE_ID_PATTERN.test(value)) {
    const digits = value.slice(2).length;
    return digits === 11
      ? "Digits only after AP, e.g. AP23111260062"
      : `Expected 11 digits after AP, got ${digits}`;
  }

  // A 2-digit year can only mean this century, so anything implying the future
  // is a typo rather than an early admission.
  const enrolled = enrollmentYear(value);
  if (enrolled !== null && enrolled > new Date().getFullYear()) {
    return `That ID says you enrolled in ${enrolled}, which is in the future`;
  }

  return undefined;
}

/** The enrollment year encoded in digits 3-4, or null if the ID is malformed. */
export function enrollmentYear(collegeId: string): number | null {
  const value = normaliseCollegeId(collegeId ?? "");
  if (!COLLEGE_ID_PATTERN.test(value)) return null;
  return 2000 + Number.parseInt(value.slice(2, 4), 10);
}

/**
 * Course lengths vary — B.Tech is 4 years, BSc and BBA are 3 (or 4 with
 * Honours/Research), M.Tech and MBA are 2, a PhD is longer still. So the
 * enrollment year alone cannot tell us when someone graduates, and guessing
 * silently gets it wrong: a 2023-enrolled BSc student is 2026 on a 3-year track
 * and 2027 on a 4-year one, and only they know which.
 *
 * Hence: offer a range, default to the most common case, let them correct it.
 */
const MIN_COURSE_YEARS = 2;
const MAX_COURSE_YEARS = 7;
const TYPICAL_COURSE_YEARS = 4;

export function graduationYearOptions(collegeId: string): number[] {
  const enrolled = enrollmentYear(collegeId);
  if (enrolled === null) return [];

  return Array.from(
    { length: MAX_COURSE_YEARS - MIN_COURSE_YEARS + 1 },
    (_, i) => enrolled + MIN_COURSE_YEARS + i,
  );
}

/** Pre-fill only. Always shown to the applicant for confirmation. */
export function suggestedGraduationYear(collegeId: string): number | null {
  const enrolled = enrollmentYear(collegeId);
  return enrolled === null ? null : enrolled + TYPICAL_COURSE_YEARS;
}

/**
 * Whether a claimed graduation year is consistent with the ID. Deliberately
 * wide — this exists to catch "AP23, graduating 2024", not to adjudicate
 * between a 3-year and 4-year BSc.
 */
export function isGraduationYearPlausible(collegeId: string, graduationYear: number): boolean {
  const enrolled = enrollmentYear(collegeId);
  if (enrolled === null) return true; // nothing to check against
  const gap = graduationYear - enrolled;
  return gap >= MIN_COURSE_YEARS && gap <= MAX_COURSE_YEARS;
}

/** True once the graduation year has passed, i.e. they are now an alumnus. */
export function hasGraduated(graduationYear: number | null | undefined): boolean {
  if (!graduationYear) return false;
  // SRM AP convocations run mid-year, so treat July as the cutover rather than
  // flipping someone to alumnus on 1 January of their final year.
  const now = new Date();
  const cutover = new Date(graduationYear, 6, 1);
  return now >= cutover;
}
