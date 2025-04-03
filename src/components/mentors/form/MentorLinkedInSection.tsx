
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MentorFormData } from "../MentorProfileForm";

interface MentorLinkedInSectionProps {
  formData: MentorFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const MentorLinkedInSection = ({ formData, handleChange }: MentorLinkedInSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
      <Input
        id="linkedin_url"
        name="linkedin_url"
        type="url"
        value={formData.linkedin_url}
        onChange={handleChange}
        placeholder="https://linkedin.com/in/yourprofile"
      />
    </div>
  );
};

export default MentorLinkedInSection;
