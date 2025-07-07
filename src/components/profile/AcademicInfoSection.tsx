
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AcademicInfoSectionProps {
  formData: {
    university: string;
    year_of_studies: string;
    cgpa: string;
    hobbies: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  isMentor: boolean;
}

const AcademicInfoSection = ({ formData, handleChange, isMentor }: AcademicInfoSectionProps) => {
  const handleYearOfStudiesChange = (value: string) => {
    const syntheticEvent = {
      target: {
        name: 'year_of_studies',
        value: value,
      },
    } as React.ChangeEvent<HTMLSelectElement>;
    
    handleChange(syntheticEvent);
  };

  // Only show academic info for mentors
  if (!isMentor) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="university">University</Label>
            <Input
              id="university"
              name="university"
              value={formData.university || ''}
              onChange={handleChange}
              placeholder="Your university name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year_of_studies">Year of Studies</Label>
            <Select value={formData.year_of_studies || ''} onValueChange={handleYearOfStudiesChange}>
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
            <Label htmlFor="cgpa">CGPA (out of 10)</Label>
            <Input
              id="cgpa"
              name="cgpa"
              type="number"
              min="0.0"
              max="10.0"
              step="0.01"
              value={formData.cgpa || ''}
              onChange={handleChange}
              placeholder="e.g., 8.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hobbies">Hobbies & Interests</Label>
            <Textarea
              id="hobbies"
              name="hobbies"
              value={formData.hobbies || ''}
              onChange={handleChange}
              placeholder="Share your hobbies and interests..."
              className="min-h-[100px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AcademicInfoSection;
