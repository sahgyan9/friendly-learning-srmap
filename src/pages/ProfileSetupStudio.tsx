import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
  Plus,
  Trash2,
  Eye,
  Edit3,
  Loader2,
  Share2,
  Check,
  ShieldCheck,
  Zap,
  Globe,
  Smile,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ResumePdfImport from "@/components/mentors/form/ResumePdfImport";
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { getMentorById, updateMentorSummary } from "@/integrations/supabase/services/mentors";
import { getEnhancedMentorProfile } from "@/utils/mentor-enhancements";
import type { Mentor } from "@/types/mentor";
import SEOHead from "@/components/SEOHead";

interface StudioProfileState {
  name: string;
  department: string;
  year_of_studies: string;
  university: string;
  tagline: string;
  skills: string[];
  bio: string;
  linkedin_url: string;
  outcomes: string[];
  ask_me_anything: Array<{ topic: string; icon?: string }>;
  ideal_mentees: string[];
  isDiscoverable: boolean;
}

export default function ProfileSetupStudio() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"edit" | "preview">("edit");
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);

  // Studio Form State
  const [state, setState] = useState<StudioProfileState>({
    name: "",
    department: "",
    year_of_studies: "3rd Year",
    university: "SRM University-AP",
    tagline: "",
    skills: [],
    bio: "",
    linkedin_url: "",
    outcomes: [],
    ask_me_anything: [],
    ideal_mentees: [],
    isDiscoverable: true,
  });

  const [newSkillInput, setNewSkillInput] = useState("");
  const [newOutcomeInput, setNewOutcomeInput] = useState("");
  const [newAmaInput, setNewAmaInput] = useState("");
  const [newIdealMenteeInput, setNewIdealMenteeInput] = useState("");

  // Load existing profile or mentor data on mount
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch user row
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        // 2. Fetch mentor row
        const { data: mentorData } = await getMentorById(user.id);

        const mergedSkills = mentorData?.skills?.length
          ? mentorData.skills
          : userData?.skills || [];

        const defaultOutcomes = Array.isArray(mentorData?.outcomes)
          ? mentorData.outcomes
          : [];

        const defaultAma = Array.isArray(mentorData?.ask_me_anything)
          ? mentorData.ask_me_anything.map((item: any) =>
              typeof item === "string" ? { topic: item } : item
            )
          : [];

        const defaultIdealMentees = Array.isArray(mentorData?.ideal_mentees)
          ? mentorData.ideal_mentees
          : [];

        setState({
          name: mentorData?.name || userData?.name || "",
          department: mentorData?.department || userData?.department || "Computer Science and Engineering",
          year_of_studies: (mentorData?.year_of_studies ? String(mentorData.year_of_studies) : "3rd Year"),
          university: mentorData?.university || "SRM University-AP",
          tagline: mentorData?.tagline || "",
          skills: mergedSkills,
          bio: mentorData?.bio || userData?.bio || "",
          linkedin_url: mentorData?.linkedin_url || userData?.linkedin_url || "",
          outcomes: defaultOutcomes,
          ask_me_anything: defaultAma,
          ideal_mentees: defaultIdealMentees,
          isDiscoverable: userData?.interests_discoverable ?? true,
        });
      } catch (err) {
        console.error("Error loading profile studio data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Handle PDF import structured extraction
  const handlePdfImported = (data: Record<string, any>) => {
    setState((prev) => {
      const skillsArray = Array.isArray(data.skills)
        ? data.skills
        : typeof data.skills === "string" && data.skills.trim()
        ? data.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : prev.skills;

      const outcomesArray = Array.isArray(data.outcomes) && data.outcomes.length > 0
        ? data.outcomes
        : prev.outcomes;

      const amaArray = Array.isArray(data.ask_me_anything) && data.ask_me_anything.length > 0
        ? data.ask_me_anything.map((t: any) => (typeof t === "string" ? { topic: t } : t))
        : prev.ask_me_anything;

      const idealMenteesArray = Array.isArray(data.ideal_mentees) && data.ideal_mentees.length > 0
        ? data.ideal_mentees
        : prev.ideal_mentees;

      return {
        ...prev,
        name: data.name || prev.name,
        department: data.department || prev.department,
        year_of_studies: data.year_of_studies || prev.year_of_studies,
        university: data.university || prev.university,
        tagline: data.tagline || prev.tagline || (skillsArray.length > 0 ? `Helping peers with ${skillsArray.slice(0, 2).join(" & ")}` : ""),
        skills: skillsArray,
        bio: data.bio || prev.bio,
        linkedin_url: data.linkedin_url || prev.linkedin_url,
        outcomes: outcomesArray,
        ask_me_anything: amaArray,
        ideal_mentees: idealMenteesArray,
      };
    });

    toast.success("Resume parsed! Review AI suggestions on the left, check your live preview on the right.");
  };

  // Skill Handlers
  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (state.skills.includes(trimmed)) {
      toast.info("Skill already added");
      return;
    }
    setState((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Outcomes Handlers
  const handleAddOutcome = () => {
    const trimmed = newOutcomeInput.trim();
    if (!trimmed) return;
    setState((prev) => ({ ...prev, outcomes: [...prev.outcomes, trimmed] }));
    setNewOutcomeInput("");
  };

  const handleRemoveOutcome = (idx: number) => {
    setState((prev) => ({
      ...prev,
      outcomes: prev.outcomes.filter((_, i) => i !== idx),
    }));
  };

  // AMA Handlers
  const handleAddAma = () => {
    const trimmed = newAmaInput.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      ask_me_anything: [...prev.ask_me_anything, { topic: trimmed }],
    }));
    setNewAmaInput("");
  };

  const handleRemoveAma = (idx: number) => {
    setState((prev) => ({
      ...prev,
      ask_me_anything: prev.ask_me_anything.filter((_, i) => i !== idx),
    }));
  };

  // Ideal Mentees Handlers
  const handleAddIdealMentee = () => {
    const trimmed = newIdealMenteeInput.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      ideal_mentees: [...prev.ideal_mentees, trimmed],
    }));
    setNewIdealMenteeInput("");
  };

  const handleRemoveIdealMentee = (idx: number) => {
    setState((prev) => ({
      ...prev,
      ideal_mentees: prev.ideal_mentees.filter((_, i) => i !== idx),
    }));
  };

  // Calculate completeness
  const completeness = useMemo(() => {
    const checks = [
      { label: "Photo / Avatar", done: Boolean(profile?.profile_image) },
      { label: "One-line Tagline", done: Boolean(state.tagline?.trim()) },
      { label: "Skills (3+)", done: state.skills.length >= 3 },
      { label: "What I Can Help With", done: state.outcomes.length > 0 || state.ask_me_anything.length > 0 },
      { label: "Bio or LinkedIn", done: Boolean(state.bio?.trim() || state.linkedin_url?.trim()) },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    const score = Math.round((doneCount / checks.length) * 100);
    return { score, checks };
  }, [state, profile]);

  // Enhanced mentor mock for live preview
  const previewMentor = useMemo(() => {
    return getEnhancedMentorProfile({
      id: user?.id || "preview-id",
      name: state.name || "Your Name",
      department: state.department || "Physics",
      university: state.university || "SRM University-AP",
      year_of_studies: state.year_of_studies || "3rd Year",
      tagline: state.tagline || null,
      skills: state.skills,
      bio: state.bio || "Passionate about peer learning and collaborating with classmates.",
      linkedin_url: state.linkedin_url || null,
      profile_image: profile?.profile_image || null,
      outcomes: state.outcomes,
      ask_me_anything: state.ask_me_anything,
      ideal_mentees: state.ideal_mentees,
      rating: 5.0,
      review_count: 0,
      is_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  }, [state, user, profile]);

  // Save and Publish Handler
  const handlePublish = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    if (!state.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (state.skills.length === 0) {
      toast.error("Please add at least 2-3 skills so peers can find you");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Publishing your campus profile...");

    try {
      // 1. Update public.users
      const userUpdatePayload = {
        name: state.name.trim(),
        department: state.department.trim(),
        skills: state.skills,
        bio: state.bio.trim() || undefined,
        linkedin_url: state.linkedin_url.trim() || undefined,
        interests_discoverable: state.isDiscoverable,
      };

      const { error: userErr } = await supabase
        .from("users")
        .update(userUpdatePayload as any)
        .eq("id", user.id);

      if (userErr) throw userErr;

      // 2. Upsert into public.mentors
      const mentorPayload = {
        id: user.id,
        name: state.name.trim(),
        department: state.department.trim(),
        university: state.university.trim() || "SRM University-AP",
        year_of_studies: state.year_of_studies,
        skills: state.skills,
        bio: state.bio.trim() || undefined,
        linkedin_url: state.linkedin_url.trim() || undefined,
        profile_image: profile?.profile_image || undefined,
        is_available: true,
      };

      const { error: mentorErr } = await supabase
        .from("mentors")
        .upsert(mentorPayload as any, { onConflict: "id" });

      if (mentorErr) {
        console.warn("Mentor upsert note:", mentorErr);
      }

      // 3. Update summary fields (tagline, outcomes, AMA, ideal mentees)
      await updateMentorSummary(user.id, {
        tagline: state.tagline.trim() || null,
        outcomes: state.outcomes.map((s) => s.trim()).filter(Boolean),
        ask_me_anything: state.ask_me_anything.map((a) => ({ topic: a.topic.trim() })).filter((a) => Boolean(a.topic)),
        ideal_mentees: state.ideal_mentees.map((s) => s.trim()).filter(Boolean),
      });

      await refreshProfile();

      toast.success("🎉 Profile published live to Friendly Learning SRMAP!", { id: toastId });
      
      // Navigate to the user's live public profile
      setTimeout(() => {
        navigate(`/mentor/${user.id}`);
      }, 600);
    } catch (err: any) {
      console.error("Error publishing profile:", err);
      toast.error(err?.message || "Failed to publish profile. Please try again.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Opening Profile Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-20">
      <SEOHead
        title="Profile Setup Studio | Friendly Learning SRMAP"
        description="Review, polish, and preview your campus profile before publishing."
      />

      {/* Top Sticky Header */}
      <header className="sticky top-16 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Exit Studio</span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Profile Review & Polish Studio
              </h1>
              <p className="text-2xs text-muted-foreground hidden sm:block">
                Edit on the left, watch your live public card update on the right.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortalDialogOpen(true)}
              className="hidden md:flex gap-1.5 text-xs font-medium"
            >
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Link Courses
            </Button>

            <Button
              onClick={handlePublish}
              disabled={isSaving}
              size="sm"
              className="gap-2 font-bold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground px-4"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 stroke-[3]" />
              )}
              <span>Publish Profile</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Switcher Tab (Only on small screens) */}
      <div className="lg:hidden mx-auto max-w-lg px-4 pt-4">
        <div className="grid grid-cols-2 rounded-xl bg-card p-1 border border-border/80 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveMobileTab("edit")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeMobileTab === "edit"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit Profile Data
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab("preview")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeMobileTab === "preview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Live Preview ({completeness.score}%)
          </button>
        </div>
      </div>

      {/* Main Studio Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        {/* Quick Ingest / Re-import Banner */}
        <section className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-2xs font-bold text-primary uppercase tracking-wider">
                <Zap className="h-3 w-3" />
                AI Smart Extraction
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Want to auto-fill everything in 10 seconds?
              </h2>
              <p className="text-xs text-muted-foreground">
                Upload your resume or LinkedIn PDF export to instantly draft your skills, headline, outcomes, and topics.
              </p>
            </div>
            <div className="shrink-0">
              <ResumePdfImport onImported={handlePdfImported} />
            </div>
          </div>
        </section>

        {/* Studio Grid: Left (Editor) & Right (Sticky Live Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: INTERACTIVE EDITOR */}
          <div
            className={`space-y-6 lg:col-span-7 ${
              activeMobileTab === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            {/* 1. Basic Identity */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Basic Information</h3>
                  <p className="text-2xs text-muted-foreground">How peers and professors identify you</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Full Name</label>
                  <Input
                    value={state.name}
                    onChange={(e) => setState({ ...state, name: e.target.value })}
                    placeholder="e.g. Gyan Kumar Sah"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Department / Major</label>
                  <Input
                    value={state.department}
                    onChange={(e) => setState({ ...state, department: e.target.value })}
                    placeholder="e.g. Physics or Computer Science"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Year of Studies</label>
                  <select
                    value={state.year_of_studies}
                    onChange={(e) => setState({ ...state, year_of_studies: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                    <option value="Graduated">Graduated / Alumni</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">University / Location</label>
                  <Input
                    value={state.university}
                    onChange={(e) => setState({ ...state, university: e.target.value })}
                    placeholder="SRM University-AP"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 2. One-Line Tagline Headline */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                      One-Line Tagline
                      <Badge variant="secondary" className="text-2xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        High Visibility
                      </Badge>
                    </h3>
                    <p className="text-2xs text-muted-foreground">Appears below your name across CampusMind search results</p>
                  </div>
                </div>
                <span className="text-2xs text-muted-foreground tabular-nums">
                  {state.tagline.length}/120
                </span>
              </div>

              <div className="space-y-2">
                <Input
                  value={state.tagline}
                  maxLength={120}
                  onChange={(e) => setState({ ...state, tagline: e.target.value })}
                  placeholder="e.g. Helping peers with Quantum Mechanics, React development & lab prep"
                  className="text-sm font-medium"
                />
                <div className="flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
                  <span className="font-semibold">💡 Quick Ideas:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        tagline: `Helping juniors master ${prev.skills[0] || "core subjects"} & lab work`,
                      }))
                    }
                    className="underline hover:text-foreground"
                  >
                    "Helping juniors master..."
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        tagline: `Happy to review projects, coursework & share notes on ${prev.skills[0] || "courses"}`,
                      }))
                    }
                    className="underline hover:text-foreground"
                  >
                    "Happy to review projects..."
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Skills & Expertise */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Skills & Expertise</h3>
                    <p className="text-2xs text-muted-foreground">Classmates will discover you when searching these topics</p>
                  </div>
                </div>
                <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {state.skills.length} added
                </span>
              </div>

              {/* Skill Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2 rounded-xl bg-muted/40 border border-border/60">
                {state.skills.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic py-1 px-2">
                    No skills added yet. Add a few below or upload your resume PDF!
                  </span>
                ) : (
                  state.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background text-foreground border border-border shadow-2xs hover:border-destructive/40 transition-colors group"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        aria-label={`Remove ${skill}`}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Skill Input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Type a skill and press Enter (e.g. Quantum Mechanics, React, MATLAB)..."
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddSkill}
                  className="gap-1 font-semibold shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* 4. What I Can Help You Achieve (Outcomes) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      What I Can Help You Achieve
                    </h3>
                    <p className="text-2xs text-muted-foreground">Concrete goals students walk away with after talking to you</p>
                  </div>
                </div>
                <span className="text-2xs font-semibold text-muted-foreground">
                  {state.outcomes.length} items
                </span>
              </div>

              {/* Outcomes List */}
              <div className="space-y-2">
                {state.outcomes.map((outcome, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {outcome}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add Outcome */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newOutcomeInput}
                    onChange={(e) => setNewOutcomeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOutcome();
                      }
                    }}
                    placeholder="e.g. Build and deploy your first React project or solve physics problem sets"
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOutcome}
                    className="shrink-0 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Outcome
                  </Button>
                </div>
              </div>
            </div>

            {/* 5. Ask Me Anything Topics */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      Ask Me Anything Topics
                    </h3>
                    <p className="text-2xs text-muted-foreground">Conversational prompts for peers reaching out</p>
                  </div>
                </div>
                <span className="text-2xs font-semibold text-muted-foreground">
                  {state.ask_me_anything.length} topics
                </span>
              </div>

              {/* AMA Badges */}
              <div className="flex flex-wrap gap-2">
                {state.ask_me_anything.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-200/60 dark:border-sky-800/60"
                  >
                    <span>💬</span>
                    {item.topic}
                    <button
                      type="button"
                      onClick={() => handleRemoveAma(idx)}
                      className="text-sky-600 hover:text-destructive transition-colors ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add AMA Topic */}
              <div className="flex items-center gap-2">
                <Input
                  value={newAmaInput}
                  onChange={(e) => setNewAmaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAma();
                    }
                  }}
                  placeholder="e.g. Quantum Algorithms, React Architecture, Research Paper Publishing..."
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAma}
                  className="shrink-0 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Topic
                </Button>
              </div>
            </div>

            {/* 6. Bio & Social Links */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  6
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Bio & Social Profiles</h3>
                  <p className="text-2xs text-muted-foreground">Share your background and connect links</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Short Bio (2-3 sentences)</label>
                  <Textarea
                    value={state.bio}
                    onChange={(e) => setState({ ...state, bio: e.target.value })}
                    rows={3}
                    placeholder="Tell peers what you're passionate about, your recent projects, or how you like to collaborate..."
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">LinkedIn Profile URL</label>
                  <Input
                    value={state.linkedin_url}
                    onChange={(e) => setState({ ...state, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 7. Privacy & CampusMind AI Discovery Consent */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  CampusMind AI Search Discovery
                </h4>
                <p className="text-2xs sm:text-xs text-muted-foreground">
                  Allow fellow SRM AP students to discover you when searching for your skills, department, or courses.
                </p>
              </div>
              <Switch
                checked={state.isDiscoverable}
                onCheckedChange={(checked) => setState({ ...state, isDiscoverable: checked })}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: STICKY LIVE PREVIEW */}
          <div
            className={`lg:col-span-5 lg:sticky lg:top-36 space-y-4 ${
              activeMobileTab === "edit" ? "hidden lg:block" : "block"
            }`}
          >
            {/* Live Preview Card Wrapper */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-md space-y-4">
              {/* Preview Header & Strength Gauge */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Live Public Card Preview
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-2xs font-bold ${
                    completeness.score >= 80
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  {completeness.score}% Complete
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <Progress value={completeness.score} className="h-1.5" />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {completeness.checks.map((check, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        check.done
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {check.done ? "✓" : "○"} {check.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Simulated Public Profile Header */}
              <div className="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3">
                <div className="flex items-start gap-3.5">
                  <MentorAvatar
                    name={previewMentor.name}
                    src={previewMentor.profile_image}
                    seed={previewMentor.id}
                    className="h-14 w-14 rounded-xl shadow-xs object-cover"
                    fallbackClassName="rounded-xl text-lg font-bold"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="text-base font-extrabold text-foreground truncate">
                      {previewMentor.name}
                    </h4>
                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-foreground/90">{state.department || "Physics"}</span>
                      <span>•</span>
                      <span>{state.year_of_studies}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">{state.university}</span>
                    </p>
                    {state.tagline ? (
                      <p className="text-xs italic text-foreground/90 pt-0.5 line-clamp-2">
                        &ldquo;{state.tagline}&rdquo;
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground pt-0.5">
                        (Add a one-line tagline on the left)
                      </p>
                    )}
                  </div>
                </div>

                {/* Simulated Connect Button */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    Available to help peers
                  </div>
                  <Button size="sm" className="h-8 text-xs font-semibold pointer-events-none opacity-90">
                    Connect
                  </Button>
                </div>
              </div>

              {/* Simulated Skills Grouping Preview */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground">Top Skills & Categorization</div>
                <div className="flex flex-wrap gap-1">
                  {state.skills.length === 0 ? (
                    <span className="text-2xs text-muted-foreground">No skills added</span>
                  ) : (
                    state.skills.slice(0, 8).map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-2xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                      >
                        {s}
                      </Badge>
                    ))
                  )}
                  {state.skills.length > 8 && (
                    <span className="text-2xs text-muted-foreground self-center font-medium">
                      +{state.skills.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              {/* Simulated Outcomes Preview */}
              {state.outcomes.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-foreground">What I can help you achieve</div>
                  <div className="space-y-1">
                    {state.outcomes.map((o, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-2xs text-foreground/90">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated Ask Me Anything Preview */}
              {state.ask_me_anything.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-foreground">Ask me anything about</div>
                  <div className="flex flex-wrap gap-1">
                    {state.ask_me_anything.map((a, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-2xs font-medium px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50"
                      >
                        💬 {a.topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready to publish callout */}
              <div className="pt-3 border-t border-border/60">
                <Button
                  onClick={handlePublish}
                  disabled={isSaving}
                  className="w-full gap-2 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground py-5 text-sm"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 stroke-[3]" />
                  )}
                  Publish Campus Profile
                </Button>
                <p className="text-[11px] text-center text-muted-foreground mt-2">
                  You can edit these details anytime from your profile page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Linked SRM Portal Course Dialog */}
      <ImportSrmPortalDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        onSuccess={() => {
          refreshProfile();
          toast.success("Courses linked to your profile!");
        }}
      />
    </div>
  );
}
