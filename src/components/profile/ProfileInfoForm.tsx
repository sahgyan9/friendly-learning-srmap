import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Loader2, User, Sparkles, Bell, BellRing, Smartphone, Send, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import AvailabilityControl from "@/components/mentors/AvailabilityControl";
import InterestsEditor from "@/components/profile/InterestsEditor";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
  push_notifications_enabled?: boolean;
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
  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    enablePush,
    disablePush,
    sendTestNotification,
  } = usePushNotifications();
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your profile details, skills and campus visibility
              </CardDescription>
            </div>
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
            >
              <Link to="/profile/setup">
                <Sparkles className="h-3.5 w-3.5" />
                1-Click PDF & Portal Import
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Account Standing Badge */}
            <div className="p-3 bg-muted/60 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Campus Standing</span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {profile.verification_status === "rejected" ? (
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/30 font-medium text-xs px-2.5 py-0.5"
                  >
                    Action Required
                  </Badge>
                ) : profile.email?.toLowerCase().endsWith("@srmap.edu.in") || profile.verification_status === "verified" ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium text-xs px-2.5 py-0.5"
                  >
                    ✓ SRM AP Student
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-muted text-muted-foreground font-medium text-xs px-2.5 py-0.5"
                  >
                    Guest Account
                  </Badge>
                )}
                {showMentorFields && (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium text-xs px-2.5 py-0.5"
                  >
                    ⭐ Peer Mentor
                  </Badge>
                )}
              </div>
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

          {/* Notification Preferences */}
          <div className="rounded-lg border border-border/70 bg-card p-4 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Bell className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Notification Preferences</h4>
            </div>

            {/* Browser Push Notifications */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="push_notifications" className="text-sm font-medium cursor-pointer">
                    Browser Push Notifications
                  </Label>
                  {pushSubscribed ? (
                    <Badge variant="outline" className="text-2xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 py-0 h-5">
                      <CheckCircle2 className="h-3 w-3" />
                      Active on this device
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-2xs py-0 h-5">
                      Off
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Get instant alerts for messages & mentor requests on this phone or PC even when the tab is closed.
                </p>
                {pushSubscribed && (
                  <div className="pt-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-2xs text-primary gap-1 hover:bg-primary/10"
                      onClick={sendTestNotification}
                    >
                      <Send className="h-3 w-3" />
                      Send Test Notification
                    </Button>
                  </div>
                )}
              </div>
              <Switch
                id="push_notifications"
                checked={pushSubscribed}
                disabled={pushLoading || !pushSupported}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enablePush();
                  } else {
                    disablePush();
                  }
                }}
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="email_notifications" className="text-sm font-medium cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive email digests and crucial account updates to {profile.email || "your registered email"}.
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={profile.email_notifications}
                onCheckedChange={(checked) =>
                  onProfileChange({ ...profile, email_notifications: checked })
                }
              />
            </div>
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
  </>
);
}
