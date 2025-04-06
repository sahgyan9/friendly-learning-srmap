
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MentorBioFieldProps {
  bio: string;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const MentorBioField = ({ bio, handleChange }: MentorBioFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        name="bio"
        value={bio}
        onChange={handleChange}
        rows={4}
        placeholder="Tell students about yourself, your experience, and how you can help them"
      />
    </div>
  );
};

export default MentorBioField;
