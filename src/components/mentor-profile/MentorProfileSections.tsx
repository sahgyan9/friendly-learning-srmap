
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Trophy } from "lucide-react";
import { Mentor } from "@/types/mentor";

interface MentorProfileSectionsProps {
  mentor: Mentor;
}

const MentorProfileSections = ({ mentor }: MentorProfileSectionsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Skills Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Skills & Expertise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {mentor.skills && mentor.skills.length > 0 ? (
              mentor.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No skills listed</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Academic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <span className="font-medium">Department: </span>
            <span className="text-muted-foreground">{mentor.department}</span>
          </div>
          {mentor.year_of_studies && (
            <div>
              <span className="font-medium">Year of Studies: </span>
              <span className="text-muted-foreground">{mentor.year_of_studies}</span>
            </div>
          )}
          {mentor.cgpa && (
            <div>
              <span className="font-medium">CGPA: </span>
              <span className="text-muted-foreground">{mentor.cgpa}/10</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bio Section */}
      {mentor.bio && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{mentor.bio}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MentorProfileSections;
