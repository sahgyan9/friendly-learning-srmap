import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, FileText, GraduationCap, Drama, CheckCircle2, ArrowRight } from "lucide-react";
import ResumePdfImport from "@/components/mentors/form/ResumePdfImport";
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { updateMentorSummary } from "@/integrations/supabase/services/mentors";

interface ProfileKickstartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated?: () => void;
  defaultTab?: "pdf" | "portal" | "clubs";
}

export function ProfileKickstartModal({
  open,
  onOpenChange,
  onProfileUpdated,
  defaultTab = "pdf",
}: ProfileKickstartModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"pdf" | "portal" | "clubs">(defaultTab);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);

  // Parsed data preview state
  const [importedPreview, setImportedPreview] = useState<{
    name?: string;
    department?: string;
    skills?: string[];
    bio?: string;
    year_of_studies?: string;
    linkedin_url?: string;
    hobbies?: string;
    mobile?: string;
    tagline?: string;
    outcomes?: string[];
    ask_me_anything?: any[];
    ideal_mentees?: string[];
    projects?: any[];
    experiences?: any[];
  } | null>(null);

  const handlePdfImported = async (data: Record<string, any>) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    const skillsArray = Array.isArray(data.skills)
      ? data.skills
      : typeof data.skills === "string" && data.skills.trim()
        ? data.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    const preview = {
      name: data.name || profile?.name || "",
      department: data.department || profile?.department || "",
      skills: skillsArray,
      bio: data.bio || profile?.bio || "",
      year_of_studies: data.year_of_studies || "",
      linkedin_url: data.linkedin_url || profile?.linkedin_url || "",
      hobbies: data.hobbies || "",
      mobile: data.mobile || profile?.mobile || "",
      tagline: data.tagline || "",
      outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
      ask_me_anything: Array.isArray(data.ask_me_anything) ? data.ask_me_anything : [],
      ideal_mentees: Array.isArray(data.ideal_mentees) ? data.ideal_mentees : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
      experiences: Array.isArray(data.experiences) ? data.experiences : [],
    };

    setImportedPreview(preview);
    toast.success("PDF parsed! Review the preview below and click 'Save to My Profile 🎉'.");
  };

  const handleSaveImportedData = async () => {
    if (!user || !importedPreview) return;
    setIsSaving(true);

    try {
      // 1. Update users table with explicit discoverable choice
      const userUpdatePayload: Record<string, any> = {
        name: importedPreview.name || undefined,
        department: importedPreview.department || undefined,
        skills: importedPreview.skills && importedPreview.skills.length > 0 ? importedPreview.skills : undefined,
        bio: importedPreview.bio || undefined,
        linkedin_url: importedPreview.linkedin_url || undefined,
        mobile: importedPreview.mobile || undefined,
        interests_discoverable: isDiscoverable,
      };

      // Clean undefined keys
      Object.keys(userUpdatePayload).forEach(
        (key) => userUpdatePayload[key] === undefined && delete userUpdatePayload[key]
      );

      const { error: userError } = await supabase
        .from("users")
        .update(userUpdatePayload as any)
        .eq("id", user.id);

      if (userError) throw userError;

      // 2. Also update or upsert into mentors table so their public card is ready
      const mentorPayload: Record<string, any> = {
        id: user.id,
        name: importedPreview.name || profile?.name || "Student",
        department: importedPreview.department || profile?.department || "Computer Science",
        skills: importedPreview.skills || [],
        bio: importedPreview.bio || profile?.bio || "",
        linkedin_url: importedPreview.linkedin_url || profile?.linkedin_url || "",
        profile_image: profile?.profile_image || "",
        year_of_studies: importedPreview.year_of_studies || "",
        hobbies: importedPreview.hobbies || "",
        is_available: true,
      };

      if (importedPreview.projects && importedPreview.projects.length > 0) {
        mentorPayload.projects = importedPreview.projects;
      }
      if (importedPreview.experiences && importedPreview.experiences.length > 0) {
        mentorPayload.experiences = importedPreview.experiences;
      }

      const { error: mentorError } = await supabase
        .from("mentors")
        .upsert(mentorPayload as any, { onConflict: "id" });

      if (mentorError) {
        console.warn("Could not upsert mentor row:", mentorError);
      }

      // 3. Save AI summary fields if present (tagline, outcomes, AMA, ideal mentees)
      if (
        importedPreview.tagline ||
        (importedPreview.outcomes && importedPreview.outcomes.length > 0) ||
        (importedPreview.ask_me_anything && importedPreview.ask_me_anything.length > 0) ||
        (importedPreview.ideal_mentees && importedPreview.ideal_mentees.length > 0)
      ) {
        await updateMentorSummary(user.id, {
          tagline: importedPreview.tagline || null,
          outcomes: importedPreview.outcomes || [],
          ask_me_anything: (importedPreview.ask_me_anything || []).map((t: any) =>
            typeof t === "string" ? { topic: t } : t
          ),
          ideal_mentees: importedPreview.ideal_mentees || [],
        });
      }

      await refreshProfile();
      onProfileUpdated?.();
      toast.success("Profile saved successfully! Your public card is now active 🎉");
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error saving imported data:", err);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="h-4 w-4" />
              10-Second Fast Setup
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              Help Peers & Juniors Find You
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Auto-fill your campus profile with your skills, coursework, and clubs so classmates can connect for projects, hackathons, and study sessions.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as "pdf" | "portal" | "clubs")}
            className="mt-2 w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pdf" className="text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Resume File
              </TabsTrigger>
              <TabsTrigger value="portal" className="text-xs sm:text-sm flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                SRM Portal
              </TabsTrigger>
              <TabsTrigger value="clubs" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Drama className="h-4 w-4" />
                Clubs & Teams
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: RESUME / LINKEDIN PDF OR DOCX IMPORT */}
            <TabsContent value="pdf" className="space-y-4 pt-3">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Upload your resume (PDF or Word .docx) or LinkedIn profile export. Our AI will automatically extract your department, top skills, bio, and experience in seconds.
              </p>

              <ResumePdfImport onImported={handlePdfImported} fields="full" />

              {importedPreview && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Extracted Preview
                    </span>
                    <span className="text-xs text-muted-foreground">Ready to apply</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <strong className="text-foreground">{importedPreview.name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department:</span>{" "}
                      <strong className="text-foreground">{importedPreview.department || "—"}</strong>
                    </div>
                    {importedPreview.year_of_studies && (
                      <div>
                        <span className="text-muted-foreground">Year:</span>{" "}
                        <strong className="text-foreground">{importedPreview.year_of_studies}</strong>
                      </div>
                    )}
                    {importedPreview.linkedin_url && (
                      <div>
                        <span className="text-muted-foreground">LinkedIn:</span>{" "}
                        <span className="text-primary truncate block max-w-[200px]">{importedPreview.linkedin_url}</span>
                      </div>
                    )}
                  </div>

                  {importedPreview.skills && importedPreview.skills.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Skills ({importedPreview.skills.length}):</span>
                      <div className="flex flex-wrap gap-1">
                        {importedPreview.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {importedPreview.bio && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Bio:</span>
                      <p className="mt-0.5 text-foreground/90 italic line-clamp-2">"{importedPreview.bio}"</p>
                    </div>
                  )}

                  {/* Explicit AI Search Discovery Consent */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 mt-2">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-foreground block">CampusMind AI Search Discovery</span>
                      <span className="text-[11px] text-muted-foreground block leading-tight">
                        Allow peers to find you when asking about your skills or coursework
                      </span>
                    </div>
                    <Switch
                      checked={isDiscoverable}
                      onCheckedChange={setIsDiscoverable}
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      onClick={handleSaveImportedData}
                      disabled={isSaving}
                      className="w-full font-medium"
                    >
                      {isSaving ? "Saving..." : "Save to My Profile 🎉"}
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full font-medium gap-1.5"
                    >
                      <Link to="/profile/setup" onClick={() => onOpenChange(false)}>
                        <Sparkles className="h-4 w-4 text-primary" />
                        Open Studio to Edit & Preview Live
                      </Link>
                    </Button>
                  </div>
                  <p className="text-[11px] text-center text-muted-foreground mt-1">
                    ✓ Instantly activates your card on the campus directory.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: SRM STUDENT PORTAL SYNC */}
            <TabsContent value="portal" className="space-y-4 pt-3">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      Link SRM Student Portal
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      Automatically sync courses you have taken and your department from student.srmap.edu.in. Your CGPA stays completely private, while your courses help juniors find you for subject guidance.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      setPortalDialogOpen(true);
                    }}
                    className="gap-2 font-medium"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Open Portal Sync Dialog
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: CLUBS & WORKSPACE GROUPS */}
            <TabsContent value="clubs" className="space-y-4 pt-3">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Drama className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      Clubs & Student Societies
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      All clubs and project teams you join in Workspace Groups automatically show up on your profile card, so students know what chapters you belong to!
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button asChild variant="outline" className="gap-2 font-medium">
                    <Link to="/communities?kind=club" onClick={() => onOpenChange(false)}>
                      Browse & Join SRM AP Clubs
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Standalone SRM Portal Dialog */}
      <ImportSrmPortalDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        onSuccess={() => {
          refreshProfile();
          onProfileUpdated?.();
          toast.success("Academic courses linked to profile!");
        }}
      />
    </>
  );
}
