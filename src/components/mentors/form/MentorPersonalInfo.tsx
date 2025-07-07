import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MentorFormData } from "@/hooks/useMentorForm";

interface MentorPersonalInfoProps {
  formData: MentorFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const MentorPersonalInfo = ({ formData, handleChange }: MentorPersonalInfoProps) => {
  const handleDepartmentChange = (value: string) => {
    // Create a synthetic event to match the expected interface
    const syntheticEvent = {
      target: {
        name: 'department',
        value: value,
      },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    handleChange(syntheticEvent);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="Your full name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
        <Select value={formData.department} onValueChange={handleDepartmentChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Computer Science">Computer Science</SelectItem>
            <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
            <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
            <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
            <SelectItem value="Business Administration">Account & Finance</SelectItem>
            <SelectItem value="Physics">Physics</SelectItem>
            <SelectItem value="Mathematics">Mathematics</SelectItem>
            <SelectItem value="Chemistry">Chemistry</SelectItem>
            <SelectItem value="Biology">Biology</SelectItem>
            <SelectItem value="Biology">PhD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></Label>
        <Input
          id="mobile"
          name="mobile"
          type="tel"
          value={formData.mobile}
          onChange={handleChange}
          required
          placeholder="Enter your mobile number"
        />
      </div>
    </div>
  );
};

export default MentorPersonalInfo;
