/**
 * Human-readable meanings for the flags auto_approve_mentor_application records.
 *
 * Applications are approved instantly; these describe what a reviewer would have
 * questioned, so someone can look afterwards. The keys must match the strings
 * the database trigger appends.
 */

export type FlagSeverity = "warning" | "notice";

export interface FlagDefinition {
  /** Short label for a badge. */
  label: string;
  /** What to actually do about it. */
  detail: string;
  severity: FlagSeverity;
}

export const MENTOR_FLAGS: Record<string, FlagDefinition> = {
  college_id_duplicate: {
    label: "Duplicate College ID",
    detail:
      "Another account already claims this enrollment number. Either a typo or someone using a classmate's ID — the ID was not saved to this account.",
    severity: "warning",
  },
  college_id_missing: {
    label: "No College ID",
    detail:
      "Applied without an enrollment number, so there is nothing tying this person to SRM AP. Likely an application submitted before the field existed.",
    severity: "warning",
  },
  college_id_malformed: {
    label: "Malformed College ID",
    detail:
      "The ID does not look like AP + 11 digits. The form rejects this, so it arriving here means the application bypassed the form.",
    severity: "warning",
  },
  graduation_year_implausible: {
    label: "Graduation year doesn't fit",
    detail:
      "The graduation year is less than 2 or more than 7 years after the enrollment year in their College ID.",
    severity: "warning",
  },
  graduation_year_missing: {
    label: "No graduation year",
    detail:
      "Without this they will never be prompted to convert to an alumni mentor. Worth asking them to fill it in.",
    severity: "notice",
  },
  cgpa_possibly_4_point_scale: {
    label: "CGPA may be out of 4",
    detail:
      "SRM AP grades out of 10, and a value of 4 or below is usually a 4-point GPA typed into a 10-point field. This makes a strong student look weak on their profile.",
    severity: "notice",
  },
};

export function describeFlag(flag: string): FlagDefinition {
  return (
    MENTOR_FLAGS[flag] ?? {
      label: flag,
      detail: "Unrecognised flag — it may have been added to the database trigger but not here.",
      severity: "notice",
    }
  );
}

/** A single flag needing attention outranks any number of mere notices. */
export function highestSeverity(flags: string[] | null | undefined): FlagSeverity | null {
  if (!flags || flags.length === 0) return null;
  return flags.some((flag) => describeFlag(flag).severity === "warning") ? "warning" : "notice";
}
