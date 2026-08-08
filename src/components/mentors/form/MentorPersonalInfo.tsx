import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MentorFormData } from "@/hooks/useMentorForm";
import { getFacultyDepartments } from "@/integrations/supabase/services/faculty";
import { FormField, describedBy, invalidControlClass } from "./FormField";
import type { MentorFormErrors } from "@/lib/mentor-form-validation";

interface MentorPersonalInfoProps {
  formData: MentorFormData;
  errors: MentorFormErrors;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  markTouched: (field: keyof MentorFormData) => void;
}

/**
 * Fallback department list, used only if the faculty directory can't be reached.
 *
 * The previous hardcoded list had two entries sharing `value="Biology"` — one
 * labelled Biology and one labelled PhD — so anyone picking PhD silently filed
 * as a Biology mentor, and React logged a duplicate-key warning on every render.
 */
const FALLBACK_DEPARTMENTS = [
  "CSE",
  "ECE",
  "EEE",
  "Mechanical Engineering",
  "Civil Engineering",
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biological Sciences",
  "Commerce",
  "Economics",
  "Management",
  "Liberal Arts",
];

const MentorPersonalInfo = ({
  formData,
  errors,
  handleChange,
  handleBlur,
  markTouched,
}: MentorPersonalInfoProps) => {
  // The faculty directory is synced monthly from the university, so it is the
  // most accurate department list the app has — better than a list that has to
  // be edited by hand every time the university reorganises a school.
  const [departments, setDepartments] = useState<string[]>(FALLBACK_DEPARTMENTS);

  useEffect(() => {
    let cancelled = false;

    getFacultyDepartments().then(({ data }) => {
      if (!cancelled && data.length > 0) setDepartments(data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectDepartment = (value: string) => {
    // The list swaps from the fallback to the synced faculty departments once
    // that request lands, and Radix answers a changed item list with an empty
    // onValueChange — which would clear a department picked in the meantime.
    // See the same guard, and the bug it was found through, in MentorAcademicInfo.
    if (!value) return;

    markTouched("department");
    handleChange({
      target: { name: "department", value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FormField id="name" label="Full name" required error={errors.name}>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="name"
          aria-describedby={describedBy("name", errors.name)}
          aria-invalid={Boolean(errors.name)}
          className={invalidControlClass(errors.name)}
          placeholder="Your full name"
        />
      </FormField>

      <FormField id="department" label="Department" required error={errors.department}>
        <Select value={formData.department} onValueChange={selectDepartment}>
          <SelectTrigger
            id="department"
            aria-describedby={describedBy("department", errors.department)}
            aria-invalid={Boolean(errors.department)}
            className={invalidControlClass(errors.department)}
          >
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id="mobile"
        label="Mobile number"
        required
        error={errors.mobile}
        hint="Only visible to the Friendly Learning team, never shown on your profile"
      >
        <Input
          id="mobile"
          name="mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={formData.mobile}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-describedby={describedBy("mobile", errors.mobile, true)}
          aria-invalid={Boolean(errors.mobile)}
          className={invalidControlClass(errors.mobile)}
          placeholder="e.g. 9876543210"
        />
      </FormField>
    </div>
  );
};

export default MentorPersonalInfo;
