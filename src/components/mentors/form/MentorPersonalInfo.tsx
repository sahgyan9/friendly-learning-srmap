
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
        <Label htmlFor="university">University <span className="text-red-500">*</span></Label>
        <Input
          id="university"
          name="university"
          value={formData.university}
          onChange={handleChange}
          required
          placeholder="SRM University AP"
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
            <SelectItem value="Business Administration">Business Administration</SelectItem>
            <SelectItem value="Physics">Physics</SelectItem>
            <SelectItem value="Mathematics">Mathematics</SelectItem>
            <SelectItem value="Chemistry">Chemistry</SelectItem>
            <SelectItem value="Biology">Biology</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="year_of_studies">Year of Studies <span className="text-red-500">*</span></Label>
        <Select value={formData.year_of_studies} onValueChange={(value) => {
          const syntheticEvent = {
            target: { name: 'year_of_studies', value: value }
          } as React.ChangeEvent<HTMLSelectElement>;
          handleChange(syntheticEvent);
        }} required>
          <SelectTrigger>
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1st Year">1st Year</SelectItem>
            <SelectItem value="2nd Year">2nd Year</SelectItem>
            <SelectItem value="3rd Year">3rd Year</SelectItem>
            <SelectItem value="4th Year">4th Year</SelectItem>
            <SelectItem value="Graduate">Graduate</SelectItem>
            <SelectItem value="Post Graduate">Post Graduate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cgpa">CGPA <span className="text-red-500">*</span></Label>
        <Input
          id="cgpa"
          name="cgpa"
          type="number"
          step="0.01"
          min="0"
          max="10"
          value={formData.cgpa}
          onChange={handleChange}
          required
          placeholder="Enter your CGPA (e.g., 8.5)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hobbies">Hobbies</Label>
        <Input
          id="hobbies"
          name="hobbies"
          value={formData.hobbies}
          onChange={handleChange}
          placeholder="e.g., Reading, Gaming, Sports"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="other_departments">Other Departments (Optional)</Label>
        <Input
          id="other_departments"
          name="other_departments"
          value={formData.other_departments}
          onChange={handleChange}
          placeholder="Other departments you can mentor in (comma separated)"
        />
      </div>
    </div>
  );
};

export default MentorPersonalInfo;
