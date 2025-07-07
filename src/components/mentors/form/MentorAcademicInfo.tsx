import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MentorFormData } from "@/hooks/useMentorForm";

interface MentorAcademicInfoProps {
  formData: MentorFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const MentorAcademicInfo = ({ formData, handleChange }: MentorAcademicInfoProps) => {
  const handleYearOfStudiesChange = (value: string) => {
    const syntheticEvent = {
      target: {
        name: 'year_of_studies',
        value: value,
      },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    handleChange(syntheticEvent);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="university">University <span className="text-red-500">*</span></Label>
          <Input
            id="university"
            name="university"
            value={formData.university}
            onChange={handleChange}
            required
            placeholder="Your university name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year_of_studies">Year of Studies <span className="text-red-500">*</span></Label>
          <Select value={formData.year_of_studies} onValueChange={handleYearOfStudiesChange} required>
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Year">1st Year</SelectItem>
              <SelectItem value="2nd Year">2nd Year</SelectItem>
              <SelectItem value="3rd Year">3rd Year</SelectItem>
              <SelectItem value="4th Year">4th Year</SelectItem>
              <SelectItem value="5th Year">5th Year</SelectItem>
              <SelectItem value="Graduate">Graduate</SelectItem>
              <SelectItem value="Postgraduate">Postgraduate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cgpa">CGPA <span className="text-red-500">*</span></Label>
          <Input
            id="cgpa"
            name="cgpa"
            type="number"
            min="0.0"
            max="4.0"
            step="0.01"
            value={formData.cgpa}
            onChange={handleChange}
            required
            placeholder="e.g., 3.85"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hobbies">Hobbies & Interests</Label>
          <Textarea
            id="hobbies"
            name="hobbies"
            value={formData.hobbies}
            onChange={handleChange}
            placeholder="Share your hobbies and interests..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};

export default MentorAcademicInfo;