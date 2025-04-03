
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentorFormData } from "../MentorProfileForm";

interface MentorSkillsSectionProps {
  formData: MentorFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const MentorSkillsSection = ({ formData, handleChange }: MentorSkillsSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="skills">Skills <span className="text-red-500">*</span></Label>
      <Input
        id="skills"
        name="skills"
        value={formData.skills}
        onChange={handleChange}
        required
        placeholder="Python, Data Structures, Machine Learning (comma separated)"
      />
      <p className="text-xs text-muted-foreground">List your areas of expertise (comma separated)</p>
    </div>
  );
};

export default MentorSkillsSection;
