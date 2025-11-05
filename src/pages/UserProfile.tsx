
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, User, Mail, Phone, LinkIcon, FileText, Calendar, Upload, Camera, Award, BookOpen, GraduationCap, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import { EmailNotificationSettings } from "@/components/profile/EmailNotificationSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  mobile: string;
  bio: string;
  linkedin_url: string;
  department: string;
  profile_image: string;
  role: string;
  skills: string[];
  is_available: boolean;
  verification_status: string;
  email_notifications: boolean;
  email_frequency: string;
}

interface MentorProfile {
  cgpa: number | null;
  year_of_studies: string;
  university: string;
  hobbies: string;
  rating: number;
  review_count: number;
}

const UserProfile = () => {
  const { user, profile: authProfile, isMentor } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
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
  });
  const [mentorProfile, setMentorProfile] = useState<MentorProfile>({
    cgpa: null,
    year_of_studies: "",
    university: "",
    hobbies: "",
    rating: 0,
    review_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newSkill, setNewSkill] = useState("");

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
          phone: data.phone || "",
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
        });

        // Fetch mentor-specific data if user is a mentor
        if (data.role === 'mentor' || isMentor) {
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
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingImage(true);

    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_image: imageUrl })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_image: imageUrl });
      toast.success("Profile picture updated successfully!");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Update users table
      const { error: userError } = await supabase
        .from("users")
        .update({
          name: profile.name,
          phone: profile.phone,
          mobile: profile.mobile,
          bio: profile.bio,
          linkedin_url: profile.linkedin_url,
          department: profile.department,
          skills: profile.skills,
          is_available: profile.is_available,
        })
        .eq("id", user?.id);

      if (userError) throw userError;

      // Update mentors table if user is a mentor
      if (profile.role === 'mentor' || isMentor) {
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
          // Don't throw - user table was updated successfully
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

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(skill => skill !== skillToRemove)
    });
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Profile Settings</h1>
              <p className="text-muted-foreground">
                Manage your account information and preferences
              </p>
              {(profile.role === 'mentor' || isMentor) && (
                <Badge variant="default" className="mt-2">
                  <Award className="h-3 w-3 mr-1" />
                  Mentor Account
                </Badge>
              )}
            </div>

            {/* Profile Picture Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Upload a profile picture to personalize your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32 border-4 border-border">
                    <AvatarImage
                      src={profile.profile_image}
                      alt={profile.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {profile.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col items-center gap-2">
                    <Label htmlFor="profile-image" className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploadingImage}
                        onClick={() => document.getElementById('profile-image')?.click()}
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Picture
                          </>
                        )}
                      </Button>
                    </Label>
                    <Input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                    />
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or GIF (max 5MB)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your profile details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Verification Status Badge */}
                    <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium">Verification Status</span>
                      <Badge variant={
                        profile.verification_status === 'verified' ? 'default' :
                          profile.verification_status === 'rejected' ? 'destructive' :
                            'secondary'
                      }>
                        {profile.verification_status === 'verified' && '✓ '}
                        {profile.verification_status.charAt(0).toUpperCase() + profile.verification_status.slice(1)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input
                        id="mobile"
                        type="tel"
                        value={profile.mobile}
                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                        placeholder="Enter your mobile number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={profile.department}
                        onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        placeholder="e.g., Computer Science, Mathematics"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input
                        id="linkedin_url"
                        type="url"
                        value={profile.linkedin_url}
                        onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        rows={4}
                      />
                    </div>

                    {/* Skills Section */}
                    <div className="space-y-2">
                      <Label>Skills</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Add a skill"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        />
                        <Button type="button" onClick={addSkill} variant="outline">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="cursor-pointer">
                            {skill}
                            <button
                              onClick={() => removeSkill(skill)}
                              className="ml-2 hover:text-destructive"
                              type="button"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="is_available" className="flex items-center gap-2">
                        Available for Connections
                      </Label>
                      <Select
                        value={profile.is_available ? "yes" : "no"}
                        onValueChange={(value) => setProfile({ ...profile, is_available: value === "yes" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes, I'm available</SelectItem>
                          <SelectItem value="no">No, not available</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" disabled={isSaving} className="w-full">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Email Notification Settings */}
              <EmailNotificationSettings />

              {/* Mentor-specific fields */}
              {(profile.role === 'mentor' || isMentor) && (
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
                        onChange={(e) => setMentorProfile({ ...mentorProfile, university: e.target.value })}
                        placeholder="e.g., SRM AP University"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="year_of_studies">Year of Studies</Label>
                      <Select
                        value={mentorProfile.year_of_studies}
                        onValueChange={(value) => setMentorProfile({ ...mentorProfile, year_of_studies: value })}
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
                        value={mentorProfile.cgpa || ""}
                        onChange={(e) => setMentorProfile({ ...mentorProfile, cgpa: parseFloat(e.target.value) || null })}
                        placeholder="e.g., 8.5"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hobbies">Hobbies & Interests</Label>
                      <Textarea
                        id="hobbies"
                        value={mentorProfile.hobbies}
                        onChange={(e) => setMentorProfile({ ...mentorProfile, hobbies: e.target.value })}
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
                          <p className="text-2xl font-bold">{mentorProfile.rating.toFixed(1)}</p>
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
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfile;
