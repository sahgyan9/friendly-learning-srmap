
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MentorProfileFormProps {
  bio: string;
  department: string;
  skills: string;
  linkedin_url: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const MentorProfileForm = ({ 
  bio, 
  department, 
  skills, 
  linkedin_url, 
  onChange 
}: MentorProfileFormProps) => {
  return (
    <>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={onChange}
          rows={4}
          placeholder="Tell students about yourself, your experience, and how you can help them"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            value={department}
            onChange={onChange}
          />
        </div>
        
        <div>
          <Label htmlFor="skills">Skills (comma separated)</Label>
          <Input
            id="skills"
            name="skills"
            value={skills}
            onChange={onChange}
            placeholder="Python, Data Structures, Machine Learning"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
        <Input
          id="linkedin_url"
          name="linkedin_url"
          value={linkedin_url}
          onChange={onChange}
          placeholder="https://linkedin.com/in/yourprofile"
        />
      </div>
    </>
  );
};

export default MentorProfileForm;
