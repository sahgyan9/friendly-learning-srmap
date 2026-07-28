
import { Input } from "@/components/ui/input";
import { FormField, describedBy, invalidControlClass } from "./FormField";

interface MentorLinkedInFieldProps {
  linkedin_url: string;
  error?: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const MentorLinkedInField = ({ linkedin_url, error, handleChange, handleBlur }: MentorLinkedInFieldProps) => {
  return (
    <FormField
      id="linkedin_url"
      label="LinkedIn profile"
      error={error}
      hint="Speeds up review — reviewers can confirm who you are at a glance"
    >
      <Input
        id="linkedin_url"
        name="linkedin_url"
        type="url"
        inputMode="url"
        value={linkedin_url}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-describedby={describedBy("linkedin_url", error, true)}
        aria-invalid={Boolean(error)}
        className={invalidControlClass(error)}
        placeholder="https://linkedin.com/in/yourprofile"
      />
    </FormField>
  );
};

export default MentorLinkedInField;
