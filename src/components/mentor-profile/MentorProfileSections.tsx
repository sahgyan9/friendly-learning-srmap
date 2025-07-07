
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, StarIcon, MapPin, GraduationCap, Heart } from "lucide-react";
import { Mentor } from "@/types/mentor";
import BadgeGrid from "@/components/badges/BadgeGrid";
import { useBadges } from "@/hooks/useBadges";
import ReviewsList from "@/components/rating/ReviewsList";

interface MentorProfileSectionsProps {
  mentor: Mentor;
  canRate: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

const MentorProfileSections = ({ 
  mentor, 
  canRate, 
  isOwnProfile, 
  ratingLoading, 
  onShowRatingModal 
}: MentorProfileSectionsProps) => {
  const { getUserBadges } = useBadges();
  const userBadges = getUserBadges(mentor.id);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* About Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {mentor.bio || "No bio available"}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Academic Info Section */}
      {(mentor.university || mentor.hobbies) && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mentor.university && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">University</h4>
                  <p className="text-foreground">{mentor.university}</p>
                </div>
              )}
              {mentor.year_of_studies && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Year of Studies</h4>
                  <p className="text-foreground">{mentor.year_of_studies}</p>
                </div>
              )}
              {mentor.cgpa && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">CGPA</h4>
                  <p className="text-foreground">{mentor.cgpa}/10</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Hobbies Section */}
      {mentor.hobbies && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Hobbies & Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {mentor.hobbies}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Skills Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {mentor.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Badges Section */}
      {userBadges.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeGrid badges={userBadges} maxDisplay={6} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Rating Section */}
      <motion.div variants={itemVariants} className="md:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Reviews & Ratings
            </CardTitle>
            {canRate && !isOwnProfile && (
              <Button 
                onClick={onShowRatingModal}
                disabled={ratingLoading}
                size="sm"
              >
                <StarIcon className="h-4 w-4 mr-2" />
                Rate Mentor
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              {mentor.review_count > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(mentor.rating)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xl font-bold">{mentor.rating.toFixed(1)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Based on {mentor.review_count} review{mentor.review_count !== 1 ? 's' : ''}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No reviews yet. Be the first to review this mentor!
                </div>
              )}
            </div>
            <ReviewsList mentorId={mentor.id} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MentorProfileSections;
