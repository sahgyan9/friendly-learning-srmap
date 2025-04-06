
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MentorSkillsFieldProps {
  skills: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MentorSkillsField = ({ skills, handleChange }: MentorSkillsFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="skills">Skills <span className="text-red-500">*</span></Label>
      <Input
        id="skills"
        name="skills"
        value={skills}
        onChange={handleChange}
        required
        placeholder="Python, Data Structures, Machine Learning (comma separated)"
      />
      <p className="text-xs text-gray-500">List your areas of expertise (comma separated)</p>
    </div>
  );
};

export default MentorSkillsField;
