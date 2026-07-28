
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MentorFormData } from "@/hooks/useMentorForm";
import { FormField, describedBy, invalidControlClass } from "./FormField";
import type { MentorFormErrors } from "@/lib/mentor-form-validation";

interface MentorAcademicInfoProps {
  formData: MentorFormData;
  errors: MentorFormErrors;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  markTouched: (field: keyof MentorFormData) => void;
}

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate", "Postgraduate"];

const MentorAcademicInfo = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  markTouched,
}: MentorAcademicInfoProps) => {
  const selectYear = (value: string) => {
    markTouched("year_of_studies");
    handleChange({
      target: { name: "year_of_studies", value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

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
