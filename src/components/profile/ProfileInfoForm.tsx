import { useState } from "react";
import { GraduationCap, Loader2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AvailabilityControl from "@/components/mentors/AvailabilityControl";
import InterestsEditor from "@/components/profile/InterestsEditor";
import type { MentorProfileData } from "./MentorProfileCard";

export interface UserProfileData {
  name: string;
  email: string;
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
  interests: string[];
  interests_discoverable: boolean;
}

interface ProfileInfoFormProps {
  profile: UserProfileData;
  mentorProfile: MentorProfileData;
  isMentor: boolean;
  isSaving: boolean;
  onProfileChange: (updated: UserProfileData) => void;
  onMentorProfileChange: (updated: MentorProfileData) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function ProfileInfoForm({
  profile,
  mentorProfile,
  isMentor,
  isSaving,
  onProfileChange,
  onMentorProfileChange,
  onSubmit,
}: ProfileInfoFormProps) {
  const [newSkill, setNewSkill] = useState("");

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !profile.skills.includes(trimmed)) {
      onProfileChange({ ...profile, skills: [...profile.skills, trimmed] });
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onProfileChange({
      ...profile,
      skills: profile.skills.filter((skill) => skill !== skillToRemove),
    });
  };

  const showMentorFields = profile.role === "mentor" || isMentor;

  return (
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
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Verification Status Badge */}
          <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Verification Status</span>
            <Badge
              variant={
                profile.verification_status === "verified"
                  ? "default"
                  : profile.verification_status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
            >
              {profile.verification_status === "verified" && "✓ "}
              {(profile.verification_status || "pending").charAt(0).toUpperCase() +
                (profile.verification_status || "pending").slice(1)}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => onProfileChange({ ...profile, name: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              value={profile.mobile}
              onChange={(e) => onProfileChange({ ...profile, mobile: e.target.value })}
              placeholder="Enter your mobile number"
            />
          </div>

          <InterestsEditor
            interests={profile.interests}
            onInterestsChange={(next) => onProfileChange({ ...profile, interests: next })}
            discoverable={profile.interests_discoverable}
            onDiscoverableChange={(next) =>
              onProfileChange({ ...profile, interests_discoverable: next })
            }
          />

          {showMentorFields && (
            <>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={profile.department}
                  onChange={(e) => onProfileChange({ ...profile, department: e.target.value })}
                  placeholder="e.g., Computer Science, Mathematics"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={profile.linkedin_url}
                  onChange={(e) => onProfileChange({ ...profile, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => onProfileChange({ ...profile, bio: e.target.value })}
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
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
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

              {/* Saves itself through set_mentor_availability RPC */}
              <AvailabilityControl
                isAvailable={mentorProfile.is_available}
                availableFrom={mentorProfile.available_from}
                note={mentorProfile.availability_note}
                onChange={(next) =>
                  onMentorProfileChange({ ...mentorProfile, ...next })
                }
              />
            </>
          )}

          {!showMentorFields && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/become-mentor";
              }}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Become a Mentor
            </Button>
          )}

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
  );
}
