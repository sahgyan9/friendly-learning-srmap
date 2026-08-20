import { Award, BookOpen, GraduationCap, Mail, MessageSquare, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface UserStats {
  totalConnections: number;
  totalReviews: number;
  totalBadges: number;
  messagesSent: number;
  mentoringSessions?: number;
}

interface ProfileStatsSectionProps {
  stats: UserStats;
  isMentor: boolean;
  mentorRating: number;
}

export function ProfileStatsSection({
  stats,
  isMentor,
  mentorRating,
}: ProfileStatsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Profile Statistics
        </CardTitle>
        <CardDescription>
          Your activity and achievements overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
            <Award className="h-6 w-6 mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalBadges}</p>
            <p className="text-xs text-muted-foreground">Badges</p>
          </div>

          <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
            <MessageSquare className="h-6 w-6 mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.totalConnections}</p>
            <p className="text-xs text-muted-foreground">Connections</p>
          </div>

          {isMentor ? (
            <>
              <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                <Star className="h-6 w-6 mb-2 text-primary" />
                <p className="text-2xl font-bold">{mentorRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>

              <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                <BookOpen className="h-6 w-6 mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                <Mail className="h-6 w-6 mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.messagesSent}</p>
                <p className="text-xs text-muted-foreground">Messages</p>
              </div>

              <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                <GraduationCap className="h-6 w-6 mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.mentoringSessions || 0}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
