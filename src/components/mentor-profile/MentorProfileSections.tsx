
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, MessageCircle } from "lucide-react";
import { Mentor } from "@/types/mentor";
import BadgeDisplay from "@/components/badges/BadgeDisplay";
import ReviewsList from "@/components/rating/ReviewsList";

interface MentorProfileSectionsProps {
  mentor: Mentor;
}

const MentorProfileSections = ({ mentor }: MentorProfileSectionsProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-1">
      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeDisplay userId={mentor.id} showAll={false} />
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Reviews
          </CardTitle>
          <Button variant="outline" size="sm">
            Add Review
          </Button>
        </CardHeader>
        <CardContent>
          <ReviewsList mentorId={mentor.id} />
        </CardContent>
      </Card>

      {/* Bio Section */}
      {mentor.bio && (
        <Card>
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
