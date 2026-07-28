
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FormField, describedBy, invalidControlClass } from "./FormField";
import { parseSkills } from "@/lib/mentor-form-validation";

interface MentorSkillsFieldProps {
  skills: string;
  error?: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const MentorSkillsField = ({ skills, error, handleChange, handleBlur }: MentorSkillsFieldProps) => {
  const parsed = parseSkills(skills);

  return (
    <FormField
      id="skills"
      label="Skills"
      required
      error={error}
      hint="Separate with commas — these are what students search by"
      adornment={
        parsed.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {parsed.length} skill{parsed.length === 1 ? "" : "s"}
          </span>
        ) : null
      }
    >
      <Input
        id="skills"
        name="skills"
        value={skills}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-describedby={describedBy("skills", error, true)}
        aria-invalid={Boolean(error)}
        className={invalidControlClass(error)}
        placeholder="Python, Data Structures, Machine Learning"
      />

      {/* Echoing the parsed chips back removes the guesswork about whether the
          comma separation was understood the way the applicant intended. */}
      {parsed.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {parsed.slice(0, 12).map((skill, index) => (
            <Badge key={`${skill}-${index}`} variant="secondary" className="font-normal">
              {skill}
            </Badge>
          ))}
        </div>
      )}
    </FormField>
  );
};

export default MentorSkillsField;
