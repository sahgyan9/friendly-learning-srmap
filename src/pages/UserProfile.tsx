import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Award, Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import BadgeDisplay from "@/components/badges/BadgeDisplay";
import ReviewsList from "@/components/rating/ReviewsList";
import AlumniPromptBanner from "@/components/alumni/AlumniPromptBanner";
import ImportSrmPortal from "@/components/profile/ImportSrmPortal";
import MentorDashboard from "@/components/profile/MentorDashboard";
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";
import { ProfileStatsSection, type UserStats } from "@/components/profile/ProfileStatsSection";
import { MentorProfileCard, type MentorProfileData } from "@/components/profile/MentorProfileCard";
import { ProfileInfoForm, type UserProfileData } from "@/components/profile/ProfileInfoForm";

const UserProfile = () => {
  const { user, isMentor } = useAuth();
  const [profile, setProfile] = useState<UserProfileData>({
    name: "",
    email: "",
    mobile: "",
    bio: "",
    linkedin_url: "",
    department: "",
    profile_image: "",
    role: "user",
    skills: [],
    is_available: true,
    verification_status: "pending",
    email_notifications: true,
    email_frequency: "instant",
    interests: [],
    interests_discoverable: false,
  });
  const [mentorProfile, setMentorProfile] = useState<MentorProfileData>({
    cgpa: null,
    year_of_studies: "",
    university: "",
    hobbies: "",
    rating: 0,
    review_count: 0,
    is_available: true,
    available_from: null,
    availability_note: null,
  });
  const [userStats, setUserStats] = useState<UserStats>({
    totalConnections: 0,
    totalReviews: 0,
    totalBadges: 0,
    messagesSent: 0,
    mentoringSessions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          mobile: data.mobile || "",
          bio: data.bio || "",
          linkedin_url: data.linkedin_url || "",
          department: data.department || "",
          profile_image: data.profile_image || "",
          role: data.role || "user",
          skills: data.skills || [],
          is_available: data.is_available ?? true,
          verification_status: data.verification_status || "pending",
          email_notifications: data.email_notifications ?? true,
          email_frequency: data.email_frequency || "instant",
          interests: data.interests || [],
          interests_discoverable: data.interests_discoverable ?? false,
        });

        // Fetch mentor-specific data if user is a mentor
        if (data.role === "mentor" || isMentor) {
          const { data: mentorData, error: mentorError } = await supabase
            .from("mentors")
            .select("*")
            .eq("id", user?.id)
            .single();

          if (!mentorError && mentorData) {
            setMentorProfile({
              cgpa: mentorData.cgpa,
              year_of_studies: mentorData.year_of_studies || "",
              university: mentorData.university || "",
              hobbies: mentorData.hobbies || "",
              rating: mentorData.rating || 0,
              review_count: mentorData.review_count || 0,
              is_available: mentorData.is_available ?? true,
              available_from: mentorData.available_from ?? null,
              availability_note: mentorData.availability_note ?? null,
            });
          }
        }

        // Fetch user statistics
        await fetchUserStats();
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: badgesData } = await supabase
        .from("user_badges")
        .select("id", { count: "exact" })
        .eq("user_id", user?.id);

      const { data: reviewsData } = await supabase
        .from("mentor_reviews")
        .select("id", { count: "exact" })
        .eq("mentor_id", user?.id);

      const { data: messagesData } = await supabase
        .from("messages")
        .select("id", { count: "exact" })
        .eq("sender_id", user?.id);

      const { data: connectionsData } = await supabase
        .from("conversations")
        .select("id", { count: "exact" })
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      setUserStats({
        totalBadges: badgesData?.length || 0,
        totalReviews: reviewsData?.length || 0,
        messagesSent: messagesData?.length || 0,
        totalConnections: connectionsData?.length || 0,
        mentoringSessions: reviewsData?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error: userError } = await supabase
        .from("users")
        .update({
          name: profile.name,
          mobile: profile.mobile,
          bio: profile.bio,
          linkedin_url: profile.linkedin_url,
          department: profile.department,
          skills: profile.skills,
          interests: profile.interests,
          interests_discoverable: profile.interests_discoverable,
        })
        .eq("id", user?.id);

      if (userError) throw userError;

      if (profile.role === "mentor" || isMentor) {
        const { error: mentorError } = await supabase
          .from("mentors")
          .update({
            name: profile.name,
            bio: profile.bio,
            linkedin_url: profile.linkedin_url,
            department: profile.department,
            mobile: profile.mobile,
            skills: profile.skills,
            cgpa: mentorProfile.cgpa,
            year_of_studies: mentorProfile.year_of_studies,
            university: mentorProfile.university,
            hobbies: mentorProfile.hobbies,
          })
          .eq("id", user?.id);

        if (mentorError) {
          console.error("Error updating mentor profile:", mentorError);
        }
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const isUserMentor = profile.role === "mentor" || isMentor;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences
            </p>
            {isUserMentor && (
              <Badge variant="default" className="mt-2">
                <Award className="h-3 w-3 mr-1" />
                Mentor Account
              </Badge>
            )}
          </div>

          <AlumniPromptBanner />

          <ProfileAvatarUploader
            userId={user?.id || ""}
            name={profile.name}
            profileImage={profile.profile_image}
            onImageUpdated={(url) => setProfile((p) => ({ ...p, profile_image: url }))}
          />

          <ProfileStatsSection
            stats={userStats}
            isMentor={isUserMentor}
            mentorRating={mentorProfile.rating}
          />

          <Tabs defaultValue="profile" className="w-full">
            <TabsList
              className="grid w-full"
              style={{
                gridTemplateColumns: isUserMentor ? "1fr 1fr 1fr" : "1fr 1fr",
              }}
            >
              <TabsTrigger value="profile">Profile Info</TabsTrigger>
              {isUserMentor ? (
                <>
                  <TabsTrigger value="badges">Badges</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </>
              ) : (
                <TabsTrigger value="badges">Badges</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              {/* Top of the tab on purpose: a mentor opening their profile is
                  usually asking "is any of this working?", and the answer
                  should not be below the fold. */}
              {isUserMentor && user?.id && <MentorDashboard mentorId={user.id} />}
              <ImportSrmPortal onProfileUpdate={fetchProfile} />
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <ProfileInfoForm
                  profile={profile}
                  mentorProfile={mentorProfile}
                  isMentor={isUserMentor}
                  isSaving={isSaving}
                  onProfileChange={setProfile}
                  onMentorProfileChange={setMentorProfile}
                  onSubmit={handleSubmit}
                />

                {isUserMentor && (
                  <MentorProfileCard
                    mentorProfile={mentorProfile}
                    onChange={setMentorProfile}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="badges" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    My Badges
                  </CardTitle>
                  <CardDescription>
                    Badges you've earned for your achievements and contributions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BadgeDisplay userId={user?.id || ""} showAll={true} />
                </CardContent>
              </Card>
            </TabsContent>

            {isUserMentor && (
              <TabsContent value="reviews" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Student Reviews
                    </CardTitle>
                    <CardDescription>
                      Feedback from students you've mentored
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReviewsList mentorId={user?.id || ""} />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
