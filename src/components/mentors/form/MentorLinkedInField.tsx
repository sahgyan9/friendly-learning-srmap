
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MentorLinkedInFieldProps {
  linkedin_url: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MentorLinkedInField = ({ linkedin_url, handleChange }: MentorLinkedInFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
      <Input
        id="linkedin_url"
        name="linkedin_url"
        type="url"
        value={linkedin_url}
        onChange={handleChange}
        placeholder="https://linkedin.com/in/yourprofile"
      />
    </div>
  );
};

export default MentorLinkedInField;
