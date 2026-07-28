
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormField, describedBy, invalidControlClass } from "./FormField";
import { BIO_MIN_LENGTH } from "@/lib/mentor-form-validation";

interface MentorBioFieldProps {
  bio: string;
  error?: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

const MentorBioField = ({ bio, error, handleChange, handleBlur }: MentorBioFieldProps) => {
  const length = bio.trim().length;
  const remaining = BIO_MIN_LENGTH - length;

  return (
    <FormField
      id="bio"
      label="Bio"
      required
      error={error}
      hint="What you can help with, and what you're good at. Students read this before anything else."
      adornment={
        // A live counter turns the minimum from a rejection into a target.
        <span
          className={cn(
            "text-xs tabular-nums",
            remaining > 0 ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {remaining > 0 ? `${remaining} more characters` : `${length} characters`}
        </span>
      }
    >
      <Textarea
        id="bio"
        name="bio"
        value={bio}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={5}
        aria-describedby={describedBy("bio", error, true)}
        aria-invalid={Boolean(error)}
        className={invalidControlClass(error)}
        placeholder="I'm a third-year CSE student. I've done two hackathons and tutor first-years in data structures — happy to help with C++, DSA interview prep and getting started with competitive programming."
      />
    </FormField>
  );
};

export default MentorBioField;
