
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AcademicInfoSectionProps {
  formData: {
    cgpa: string;
    year_of_studies: string;
    university: string;
    hobbies: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
}

const AcademicInfoSection = ({ formData, handleChange, handleSelectChange }: AcademicInfoSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Academic Information</h3>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="university" className="text-foreground">University</Label>
            <Input
              id="university"
              name="university"
              value={formData.university}
              onChange={handleChange}
              placeholder="Your university name"
              className="bg-background text-foreground border-border"
            />
          </div>
          
          <div>
            <Label htmlFor="year_of_studies" className="text-foreground">Year of Studies</Label>
            <Select 
              value={formData.year_of_studies} 
              onValueChange={(value) => handleSelectChange('year_of_studies', value)}
            >
              <SelectTrigger className="bg-background text-foreground border-border">
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
        
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <div>
            <Label htmlFor="cgpa" className="text-foreground">CGPA (out of 10)</Label>
            <Input
              id="cgpa"
              name="cgpa"
              type="number"
              min="0.0"
              max="10.0"
              step="0.01"
              value={formData.cgpa}
              onChange={handleChange}
              placeholder="e.g., 8.5"
              className="bg-background text-foreground border-border"
            />
          </div>
          
          <div>
            <Label htmlFor="hobbies" className="text-foreground">Hobbies & Interests</Label>
            <Textarea
              id="hobbies"
              name="hobbies"
              value={formData.hobbies}
              onChange={handleChange}
              placeholder="Share your hobbies and interests..."
              rows={3}
              className="bg-background text-foreground border-border placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicInfoSection;
