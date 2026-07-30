
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MentorFormData } from "@/hooks/useMentorForm";
import { FormField, describedBy, invalidControlClass } from "./FormField";
import type { MentorFormErrors } from "@/lib/mentor-form-validation";
import { enrollmentYear, graduationYearOptions } from "@/lib/college-id";

interface MentorAcademicInfoProps {
  formData: MentorFormData;
  errors: MentorFormErrors;
  /** True while the duplicate-ID lookup is in flight. */
  checkingCollegeId?: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  markTouched: (field: keyof MentorFormData) => void;
}

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate", "Postgraduate"];

const MentorAcademicInfo = ({
  formData,
  errors,
  checkingCollegeId = false,
  handleChange,
  handleBlur,
  markTouched,
}: MentorAcademicInfoProps) => {
  const selectField = (field: keyof MentorFormData) => (value: string) => {
    markTouched(field);
    handleChange({
      target: { name: field, value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const selectYear = selectField("year_of_studies");
  const selectGraduationYear = selectField("graduation_year");

  // Derived from the College ID, so the applicant confirms a year rather than
  // recalling one. Empty until the ID is well-formed.
  const enrolled = enrollmentYear(formData.college_id);
  const gradYearOptions = useMemo(() => {
    const options = graduationYearOptions(formData.college_id);
    const current = Number.parseInt(formData.graduation_year, 10);

    // A saved application can hold a year outside the offered range — either the
    // ID was corrected afterwards, or the row predates this field. Without the
    // current value present, Radix has nothing to match and renders an empty
    // trigger, so the applicant sees a blank control next to an error about a
    // year they cannot see.
    if (!Number.isNaN(current) && options.length > 0 && !options.includes(current)) {
      return [...options, current].sort((a, b) => a - b);
    }
    return options;
  }, [formData.college_id, formData.graduation_year]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <FormField id="university" label="University" required error={errors.university}>
          <Input
            id="university"
            name="university"
            value={formData.university}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-describedby={describedBy("university", errors.university)}
            aria-invalid={Boolean(errors.university)}
            className={invalidControlClass(errors.university)}
            placeholder="SRM University AP"
          />
        </FormField>

        <FormField
          id="college_id"
          label="College ID"
          required
          error={errors.college_id}
          hint={
            checkingCollegeId ? "Checking this ID…" : "Your enrollment number, e.g. AP23111260062"
          }
        >
          <div className="relative">
            <Input
              id="college_id"
              name="college_id"
              value={formData.college_id}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={describedBy("college_id", errors.college_id, true)}
              aria-invalid={Boolean(errors.college_id)}
              aria-busy={checkingCollegeId}
              className={`font-mono uppercase ${checkingCollegeId ? "pr-9" : ""} ${invalidControlClass(errors.college_id)}`}
              placeholder="AP23111260062"
            />
            {checkingCollegeId && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </FormField>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField id="year_of_studies" label="Year of study" required error={errors.year_of_studies}>
          <Select value={formData.year_of_studies} onValueChange={selectYear}>
            <SelectTrigger
              id="year_of_studies"
              aria-describedby={describedBy("year_of_studies", errors.year_of_studies)}
              aria-invalid={Boolean(errors.year_of_studies)}
              className={invalidControlClass(errors.year_of_studies)}
            >
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="graduation_year"
          label="Graduation year"
          required
          error={errors.graduation_year}
          hint={
            enrolled === null
              ? "Fill in your College ID first and we'll suggest this"
              : `Your ID says you enrolled in ${enrolled} — change this if your course is longer or shorter`
          }
        >
          <Select
            value={formData.graduation_year}
            onValueChange={selectGraduationYear}
            disabled={gradYearOptions.length === 0}
          >
            <SelectTrigger
              id="graduation_year"
              aria-describedby={describedBy("graduation_year", errors.graduation_year, true)}
              aria-invalid={Boolean(errors.graduation_year)}
              className={invalidControlClass(errors.graduation_year)}
            >
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {gradYearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          id="cgpa"
          label="CGPA"
          required
          error={errors.cgpa}
          hint="Out of 10 — reviewers use this to verify your academic standing"
        >
          <Input
            id="cgpa"
            name="cgpa"
            type="number"
            min="0"
            max="10"
            step="0.01"
            value={formData.cgpa}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-describedby={describedBy("cgpa", errors.cgpa, true)}
            aria-invalid={Boolean(errors.cgpa)}
            className={invalidControlClass(errors.cgpa)}
            placeholder="8.5"
          />
        </FormField>

        <FormField
          id="hobbies"
          label="Hobbies & interests"
          error={errors.hobbies}
          hint="Helps students find someone they'll click with"
        >
          <Textarea
            id="hobbies"
            name="hobbies"
            value={formData.hobbies}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-describedby={describedBy("hobbies", errors.hobbies, true)}
            placeholder="Chess, competitive programming, photography..."
            className="min-h-[100px]"
          />
        </FormField>
      </div>
    </div>
  );
};

export default MentorAcademicInfo;
