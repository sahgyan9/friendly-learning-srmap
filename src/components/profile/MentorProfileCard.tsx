import { Award, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface MentorProfileData {
  cgpa: number | null;
  year_of_studies: string;
  university: string;
  hobbies: string;
  rating: number;
  review_count: number;
  is_available: boolean;
  available_from: string | null;
  availability_note: string | null;
}

interface MentorProfileCardProps {
  mentorProfile: MentorProfileData;
  onChange: (updated: MentorProfileData) => void;
}

export function MentorProfileCard({
  mentorProfile,
  onChange,
}: MentorProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Mentor Information
        </CardTitle>
        <CardDescription>
          Additional information for mentor profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="university">University</Label>
          <Input
            id="university"
            value={mentorProfile.university}
            onChange={(e) => onChange({ ...mentorProfile, university: e.target.value })}
            placeholder="e.g., SRM AP University"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year_of_studies">Year of Studies</Label>
          <Select
            value={mentorProfile.year_of_studies}
            onValueChange={(value) => onChange({ ...mentorProfile, year_of_studies: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1st Year">1st Year</SelectItem>
              <SelectItem value="2nd Year">2nd Year</SelectItem>
              <SelectItem value="3rd Year">3rd Year</SelectItem>
              <SelectItem value="4th Year">4th Year</SelectItem>
              <SelectItem value="Graduate">Graduate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cgpa">CGPA</Label>
          <Input
            id="cgpa"
            type="number"
            step="0.01"
            min="0"
            max="10"
            value={mentorProfile.cgpa ?? ""}
            onChange={(e) =>
              onChange({
                ...mentorProfile,
                cgpa: parseFloat(e.target.value) || null,
              })
            }
            placeholder="e.g., 8.5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hobbies">Hobbies & Interests</Label>
          <Textarea
            id="hobbies"
            value={mentorProfile.hobbies}
            onChange={(e) => onChange({ ...mentorProfile, hobbies: e.target.value })}
            placeholder="Tell us about your hobbies and interests..."
            rows={3}
          />
        </div>

        {/* Display rating and review count (read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Mentor Rating
          </Label>
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <div>
              <p className="text-2xl font-bold">{(mentorProfile.rating || 0).toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">⭐ Rating</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-2xl font-bold">{mentorProfile.review_count}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
