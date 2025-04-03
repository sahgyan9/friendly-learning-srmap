
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MentorFormData } from "../MentorProfileForm";

interface MentorBioSectionProps {
  formData: MentorFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const MentorBioSection = ({ formData, handleChange }: MentorBioSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        name="bio"
        value={formData.bio}
        onChange={handleChange}
        rows={4}
        placeholder="Tell students about yourself, your experience, and how you can help them"
      />
    </div>
  );
};

export default MentorBioSection;
