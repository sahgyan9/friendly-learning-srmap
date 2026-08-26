import { useState, useEffect, useMemo, useRef } from "react";
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
  Target,
  MessageSquareCode,
  Users,
  Lightbulb,
  Radio,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Upload,
  UserRound,
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
import PostPublishPortalModal from "@/components/profile/PostPublishPortalModal";
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { getMentorById, updateMentorSummary } from "@/integrations/supabase/services/mentors";
import { getEnhancedMentorProfile } from "@/utils/mentor-enhancements";
import { formatDepartment } from "@/utils/user-utils";
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
  isAvailable: boolean;
  courses: Array<{ code: string; name: string }>;
}

/**
 * Generates natural, high-precision profile summary drafts from skills and department
 */
function generateSmartDrafts(
  skills: string[],
  department: string,
  name: string,
  bio?: string,
  year?: string
) {
  // Clean raw academic strings like "B.Sc.-Physics (Honors with Research) [UG - Full Time]" -> "BSc Physics"
  const cleanDept = formatDepartment(department) || department?.trim() || "";
  const validSkills = (skills || []).map((s) => s.trim()).filter(Boolean);

  if (validSkills.length === 0 && !cleanDept) {
    return { tagline: "", outcomes: [], ask_me_anything: [], ideal_mentees: [] };
  }

  const primarySkills =
    validSkills.length > 0
      ? validSkills.slice(0, 4)
      : [cleanDept, "Coursework", "Problem Solving"].filter(Boolean);
  const skill1 = primarySkills[0] || cleanDept || "Coursework";
  const skill2 = primarySkills[1] || (cleanDept ? `${cleanDept} Concepts` : "Problem Solving");
  const skill3 = primarySkills[2] || "Lab Work";

  // 1. Tagline: identity-first and clean — "BSc Physics student helping with Quantum Mechanics and Quantum Algorithms."
  const deptLabel = cleanDept ? `${cleanDept} student` : "Student";
  let tagline: string;
  if (validSkills.length === 0) {
    tagline = `${deptLabel} ready to help fellow students with coursework and projects.`;
  } else {
    const topics = validSkills.slice(0, 3);
    const topicsPhrase =
      topics.length >= 3
        ? `${topics[0]}, ${topics[1]}, and ${topics[2]}`
        : topics.length === 2
        ? `${topics[0]} and ${topics[1]}`
        : topics[0];
    tagline = `${deptLabel} helping with ${topicsPhrase}.`;
  }
  if (tagline.length > 120) {
    tagline = `${deptLabel} helping with ${validSkills[0]}${validSkills[1] ? ` and ${validSkills[1]}` : ""}.`;
  }

  // 2. Outcomes: Concrete, student-centered results
  const outcomes = [
    `Master problem sets, core theories, and practical intuition in ${skill1}`,
    `Get 1-on-1 guidance on ${skill2}, lab assignments, and project execution`,
    cleanDept
      ? `Prepare effectively for ${cleanDept} midterms, finals, and assessments`
      : `Prepare effectively for course assessments, exams, and project reviews`,
  ];

  // 3. Ask Me Anything: 3-4 distinct topics
  const askMeAnything = (
    validSkills.length > 0
      ? validSkills.slice(0, 4)
      : [cleanDept || "Coursework", "Exam Prep", "Projects"]
  )
    .filter(Boolean)
    .map((s) => ({ topic: s }));

  // 4. Ideal Mentees: Who benefits most
  const idealMentees = [
    cleanDept
      ? `1st or 2nd year students taking ${cleanDept} core subjects`
      : `1st or 2nd year students looking for academic & course guidance`,
    `Peers working on ${skill1} projects or research papers`,
    `Classmates seeking practical study notes, lab tips, and exam strategies`,
  ];

  return { tagline, outcomes, ask_me_anything: askMeAnything, ideal_mentees: idealMentees };
}

export default function ProfileSetupStudio() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"edit" | "preview">("edit");
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [postPublishModalOpen, setPostPublishModalOpen] = useState(false);
  // "resume" = just imported a resume, so mention that; "visit" = landed on
  // the Studio with no portal linked yet, so use the generic prompt. Either
  // way this is an inline dismissible banner, never a blocking popup.
  const [nudgeReason, setNudgeReason] = useState<"resume" | "visit" | null>(null);
  const initialNudgeCheckedRef = useRef(false);
  const hasAutoDraftedRef = useRef(false);
  const portalNudgeDismissKey = user ? `portal-nudge-dismissed-${user.id}` : null;

  // Studio Form State
  const [state, setState] = useState<StudioProfileState>({
    name: "",
    department: "",
    year_of_studies: "",
    university: "SRM University-AP",
    tagline: "",
    skills: [],
    bio: "",
    linkedin_url: "",
    outcomes: [],
    ask_me_anything: [],
    ideal_mentees: [],
    isDiscoverable: true,
    isAvailable: true,
    courses: [],
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

        const studentName = mentorData?.name || userData?.name || "";
        const studentDept = mentorData?.department || userData?.department || "";
        const studentYear = mentorData?.year_of_studies ? String(mentorData.year_of_studies) : "";
        const coursesList = Array.isArray(mentorData?.courses) ? (mentorData.courses as any[]) : [];

        const mergedSkills = mentorData?.skills?.length
          ? mentorData.skills
          : userData?.skills || [];

        const alreadyPublished = Boolean(
          mentorData?.id && (mentorData.skills?.length ?? 0) > 0 && studentDept.trim().length > 0
        );
        setIsPublished(alreadyPublished);

        let currentTagline = mentorData?.tagline || "";
        let currentOutcomes = Array.isArray(mentorData?.outcomes) ? mentorData.outcomes : [];
        let currentAma = Array.isArray(mentorData?.ask_me_anything)
          ? mentorData.ask_me_anything.map((item: any) =>
              typeof item === "string" ? { topic: item } : item
            )
          : [];
        let currentIdealMentees = Array.isArray(mentorData?.ideal_mentees)
          ? mentorData.ideal_mentees
          : [];

        // If AI summary sections are empty and skills exist, auto-generate smart drafts
        if (
          !currentTagline &&
          currentOutcomes.length === 0 &&
          currentAma.length === 0 &&
          currentIdealMentees.length === 0 &&
          mergedSkills.length > 0
        ) {
          const drafts = generateSmartDrafts(
            mergedSkills,
            studentDept,
            studentName,
            mentorData?.bio || userData?.bio || "",
            studentYear
          );
          currentTagline = drafts.tagline;
          currentOutcomes = drafts.outcomes;
          currentAma = drafts.ask_me_anything;
          currentIdealMentees = drafts.ideal_mentees;
        }

        setState({
          name: studentName,
          department: studentDept,
          year_of_studies: studentYear,
          university: mentorData?.university || "SRM University-AP",
          tagline: currentTagline,
          skills: mergedSkills,
          bio: mentorData?.bio || userData?.bio || "",
          linkedin_url: mentorData?.linkedin_url || userData?.linkedin_url || "",
          outcomes: currentOutcomes,
          ask_me_anything: currentAma,
          ideal_mentees: currentIdealMentees,
          isDiscoverable: !alreadyPublished ? true : (userData?.interests_discoverable ?? true),
          isAvailable: mentorData?.is_available ?? true,
          courses: coursesList,
        });
      } catch (err) {
        console.error("Error loading profile studio data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Prompt to link the SRM Portal once per visit if it isn't linked yet and
  // the student hasn't snoozed it this session — never on a fresh resume
  // import, since that path already shows its own reason below.
  useEffect(() => {
    if (loading || initialNudgeCheckedRef.current || !user) return;
    initialNudgeCheckedRef.current = true;
    if (state.courses.length > 0) return;
    if (portalNudgeDismissKey && sessionStorage.getItem(portalNudgeDismissKey)) return;
    setNudgeReason("visit");
  }, [loading, state.courses, user, portalNudgeDismissKey]);

  const handleDismissPortalNudge = () => {
    if (portalNudgeDismissKey) sessionStorage.setItem(portalNudgeDismissKey, "1");
    setNudgeReason(null);
  };

  // Auto-draft for users who enter skills and department manually or via SRM Portal
  useEffect(() => {
    if (loading || isPublished || hasAutoDraftedRef.current) return;

    const hasMinSkills = state.skills.length >= 2;
    const hasDept = state.department.trim().length > 0;
    const allFourEmpty =
      !state.tagline.trim() &&
      state.outcomes.length === 0 &&
      state.ask_me_anything.length === 0 &&
      state.ideal_mentees.length === 0;

    if (hasMinSkills && hasDept && allFourEmpty) {
      hasAutoDraftedRef.current = true;
      const drafts = generateSmartDrafts(
        state.skills,
        state.department,
        state.name,
        state.bio,
        state.year_of_studies
      );

      setState((prev) => ({
        ...prev,
        tagline: prev.tagline.trim() ? prev.tagline : drafts.tagline,
        outcomes: prev.outcomes.length > 0 ? prev.outcomes : drafts.outcomes,
        ask_me_anything: prev.ask_me_anything.length > 0 ? prev.ask_me_anything : drafts.ask_me_anything,
        ideal_mentees: prev.ideal_mentees.length > 0 ? prev.ideal_mentees : drafts.ideal_mentees,
      }));

      toast.success(
        "We drafted a headline and topics from your skills — edit anything that doesn't sound like you."
      );
    }
  }, [
    loading,
    isPublished,
    state.skills,
    state.department,
    state.tagline,
    state.outcomes,
    state.ask_me_anything,
    state.ideal_mentees,
    state.name,
    state.bio,
    state.year_of_studies,
  ]);

  // One-click AI Auto-Draft for all sections
  const handleAutoDraftAll = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department and at least 1-2 skills, or import your resume first so AI has context to generate suggestions.");
      return;
    }
    setIsGeneratingAi(true);
    setTimeout(() => {
      const drafts = generateSmartDrafts(
        state.skills,
        state.department,
        state.name,
        state.bio,
        state.year_of_studies
      );
      setState((prev) => ({
        ...prev,
        tagline: drafts.tagline || prev.tagline,
        outcomes: drafts.outcomes.length > 0 ? drafts.outcomes : prev.outcomes,
        ask_me_anything: drafts.ask_me_anything.length > 0 ? drafts.ask_me_anything : prev.ask_me_anything,
        ideal_mentees: drafts.ideal_mentees.length > 0 ? drafts.ideal_mentees : prev.ideal_mentees,
      }));
      setIsGeneratingAi(false);
      toast.success("✨ AI summary drafts generated for Tagline, Outcomes, AMA, and Target Students!");
    }, 300);
  };

  // Section-specific AI generators
  const handleSuggestTagline = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department or at least 1 skill first so AI can craft a relevant tagline.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.tagline) {
      setState((prev) => ({ ...prev, tagline: drafts.tagline }));
      toast.success("💡 Tagline generated based on your skills!");
    }
  };

  const handleSuggestOutcomes = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department or at least 1 skill first so AI can suggest outcomes.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.outcomes.length > 0) {
      setState((prev) => ({ ...prev, outcomes: drafts.outcomes }));
      toast.success("💡 Outcomes suggested!");
    }
  };

  const handleSuggestAma = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department or at least 1 skill first so AI can suggest AMA topics.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.ask_me_anything.length > 0) {
      setState((prev) => ({ ...prev, ask_me_anything: drafts.ask_me_anything }));
      toast.success("💡 AMA topics suggested!");
    }
  };

  const handleSuggestIdealMentees = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department or at least 1 skill first so AI can suggest target students.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.ideal_mentees.length > 0) {
      setState((prev) => ({ ...prev, ideal_mentees: drafts.ideal_mentees }));
      toast.success("💡 Target students suggested!");
    }
  };

  // Handle PDF import structured extraction
  const handlePdfImported = (data: Record<string, any>) => {
    setState((prev) => {
      const newSkills = Array.isArray(data.skills)
        ? data.skills
        : typeof data.skills === "string" && data.skills.trim()
        ? data.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      // Merge skills so existing custom-added skills are preserved
      const mergedSkills = Array.from(new Set([...prev.skills, ...newSkills]));

      const rawDept = data.department || prev.department;
      const studentDept = formatDepartment(rawDept) || rawDept;
      const studentName = data.name || prev.name;
      const studentYear = data.year_of_studies || prev.year_of_studies;

      // Smart drafts if extracted fields are missing
      const autoDrafts = generateSmartDrafts(mergedSkills, studentDept, studentName);

      const outcomesArray = Array.isArray(data.outcomes) && data.outcomes.length > 0
        ? data.outcomes
        : prev.outcomes.length > 0
        ? prev.outcomes
        : autoDrafts.outcomes;

      const amaArray = Array.isArray(data.ask_me_anything) && data.ask_me_anything.length > 0
        ? data.ask_me_anything.map((t: any) => (typeof t === "string" ? { topic: t } : t))
        : prev.ask_me_anything.length > 0
        ? prev.ask_me_anything
        : autoDrafts.ask_me_anything;

      const idealMenteesArray = Array.isArray(data.ideal_mentees) && data.ideal_mentees.length > 0
        ? data.ideal_mentees
        : prev.ideal_mentees.length > 0
        ? prev.ideal_mentees
        : autoDrafts.ideal_mentees;

      const finalTagline = data.tagline || prev.tagline || autoDrafts.tagline;

      return {
        ...prev,
        name: studentName,
        department: studentDept,
        year_of_studies: studentYear,
        university: data.university || prev.university,
        tagline: finalTagline,
        skills: mergedSkills,
        bio: data.bio || prev.bio,
        linkedin_url: data.linkedin_url || prev.linkedin_url,
        outcomes: outcomesArray,
        ask_me_anything: amaArray,
        ideal_mentees: idealMenteesArray,
      };
    });

    toast.success(
      isPublished
        ? "Resume updated! We merged new skills and refreshed your details."
        : "Resume parsed! AI has filled your skills, headline, outcomes, and topics."
    );

    // Resume alone can't see coursework — nudge toward the other 10-second
    // import so search can also match students by course code, not just skills.
    // Overrides any earlier "ask me later" snooze since this is a fresh,
    // contextual trigger rather than a repeat nag.
    setNudgeReason("resume");
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

  // Enhanced mentor mock for live preview
  const previewMentor = useMemo(() => {
    return getEnhancedMentorProfile({
      id: user?.id || "preview-id",
      name: state.name || "Your Name",
      department: state.department || "",
      university: state.university || "SRM University-AP",
      year_of_studies: state.year_of_studies || "",
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
      is_available: state.isAvailable,
      courses: state.courses,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  }, [state, user, profile]);

  // Validation requirements for publishing
  const hasName = Boolean(state.name.trim());
  const hasDepartment = Boolean(state.department.trim());
  const hasSkills = state.skills.length >= 2;
  const canPublish = hasName && hasDepartment && hasSkills;

  const missingRequirements = useMemo(() => {
    const missing: string[] = [];
    if (!hasName) missing.push("Full Name");
    if (!hasDepartment) missing.push("Department / Major");
    if (state.skills.length === 0) {
      missing.push("At least 2 skills (0 added)");
    } else if (state.skills.length < 2) {
      missing.push("At least 2 skills (1 added)");
    }
    return missing;
  }, [hasName, hasDepartment, state.skills]);

  // Calculate completeness (unified 6-point rubric)
  const completeness = useMemo(() => {
    const checks = [
      { label: "Photo / Avatar", done: Boolean(profile?.profile_image) },
      { label: "Tagline / Bio", done: Boolean(state.tagline?.trim() || state.bio?.trim()) },
      { label: "Skills (2+)", done: state.skills.length >= 2 },
      {
        label: "Outcomes / Topics",
        done: state.outcomes.length > 0 || state.ask_me_anything.length > 0,
      },
      { label: "Target Students", done: state.ideal_mentees.length > 0 },
      {
        label: "Coursework / LinkedIn",
        done: Boolean(
          state.linkedin_url?.trim() ||
            (previewMentor.courses?.length ?? 0) > 0
        ),
      },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    const score = Math.round((doneCount / checks.length) * 100);
    return { score, checks };
  }, [state, profile, previewMentor]);

  // Save and Publish Handler
  const handlePublish = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    if (!state.name.trim()) {
      toast.error("Please enter your full name");
      document.getElementById("section-basic-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!state.department.trim()) {
      toast.error("Please enter your department / major");
      document.getElementById("section-basic-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (state.skills.length < 2) {
      toast.error("Please add at least 2 skills (or import your resume) so classmates can find you");
      document.getElementById("section-skills")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(
      isPublished ? "Saving your profile changes..." : "Publishing your campus profile..."
    );

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
        is_available: state.isAvailable,
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
      setIsPublished(true);

      const isPortalLinked = state.courses.length > 0 || Boolean(profile?.date_of_birth_linked);

      toast.success(
        isPublished
          ? "✓ Profile changes saved live!"
          : "🎉 Profile published live to Friendly Learning SRMAP!",
        { id: toastId }
      );

      if (!isPortalLinked) {
        // Center popup reminding user to link SRM portal for verified coursework & badges
        setPostPublishModalOpen(true);
      } else {
        // Already linked, navigate to public profile
        setTimeout(() => {
          navigate(`/mentor/${user.id}`);
        }, 400);
      }
    } catch (err: any) {
      console.error("Error publishing profile:", err);
      toast.error(err?.message || "Failed to save profile. Please try again.", { id: toastId });
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
        title={isPublished ? "Profile Studio | Friendly Learning SRMAP" : "Profile Setup Studio | Friendly Learning SRMAP"}
        description="Review, polish, and preview your campus profile before publishing."
      />

      {/* Top Sticky Header */}
      <header className="sticky top-16 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (user?.id) {
                  navigate(`/mentor/${user.id}`);
                } else {
                  navigate(-1);
                }
              }}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isPublished ? "Back to Profile" : "Exit Studio"}
              </span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {isPublished ? "Profile Studio" : "Profile Setup Studio"}
                </h1>
                {isPublished ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-2xs gap-1 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live on Campus
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-2xs font-semibold ${
                      canPublish
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {canPublish
                      ? `${completeness.score}% · Ready to publish`
                      : `${completeness.score}% · ${missingRequirements.length} required left`}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {isPublished
                  ? "Edit on the left, watch your live public card update on the right."
                  : canPublish
                  ? "All required fields ready — you can publish your profile live."
                  : `Required before publishing: ${missingRequirements.join(", ")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!(nudgeReason && state.courses.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPortalDialogOpen(true)}
                className="hidden md:flex gap-1.5 text-xs font-medium"
              >
                <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {state.courses.length > 0 ? `SRM Portal Linked (${state.courses.length})` : "Link SRM Portal"}
              </Button>
            )}

            <Button
              onClick={handlePublish}
              disabled={isSaving || (!isPublished && !canPublish)}
              size="sm"
              className={`gap-2 font-bold shadow-sm px-4 ${
                !isPublished && !canPublish
                  ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-75"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
              title={
                !isPublished && !canPublish
                  ? `Required to publish: ${missingRequirements.join(", ")}`
                  : undefined
              }
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 stroke-[3]" />
              )}
              <span>
                {isPublished
                  ? "Save Changes"
                  : canPublish
                  ? "Publish Profile"
                  : "Complete Info to Publish"}
              </span>
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {/* Onboarding Kickstart / Mode Selector for Incomplete Profiles vs Management Toolbar */}
        {!isPublished && completeness.score < 60 ? (
          <section className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-indigo-500/10 p-5 sm:p-6 shadow-xs">
            <div className="max-w-3xl space-y-1.5 mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-2xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Step 1: Choose How to Fill Your Details
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground">
                Fast-track with your resume or enter your details manually
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Import your resume or LinkedIn PDF to fill your skills, headline, outcomes, and bio automatically in ~5 seconds, or start filling manually below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Fast Resume Import */}
              <div className="rounded-xl border border-primary/40 bg-card p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs hover:border-primary transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-2xs font-extrabold bg-primary text-primary-foreground px-2 py-0.5 rounded-md uppercase tracking-wider">
                      ⚡ 5-Second Auto-Fill
                    </span>
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Import from Resume (PDF or Word .docx)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Upload your resume. Gemini AI extracts your department, skills, bio, tagline, and mentoring topics instantly.
                  </p>
                </div>
                <ResumePdfImport
                  onImported={handlePdfImported}
                  buttonLabel="Upload Resume"
                />
              </div>

              {/* Option B: Fill Manually */}
              <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs hover:border-border transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-2xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-md uppercase tracking-wider">
                      ✍️ Custom Entry
                    </span>
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Fill Details Step-by-Step
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Prefer entering details by hand? Scroll down to customize your bio, pick your skills, and craft your outcomes.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    document.getElementById("section-basic-info")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="font-bold text-xs"
                >
                  Start Custom Form
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-indigo-500/5 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-2xs font-bold text-primary uppercase tracking-wider">
                  {isPublished ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Zap className="h-3 w-3" />}
                  {isPublished ? "Profile Management & Re-sync" : "AI Smart Extraction & Auto-Draft"}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  {isPublished
                    ? "Update skills, re-upload resume, or re-sync SRM Portal"
                    : "Auto-fill your headline, outcomes, and topics with AI"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isPublished
                    ? "Upload a new resume (PDF or Word) to merge newly acquired skills or re-sync your latest semester grades from SRM AP."
                    : "Upload your resume (PDF or Word) or click Auto-Draft to generate tailored profile summaries based on your skills."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoDraftAll}
                  className="gap-1.5 font-bold text-xs bg-background/80"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {isPublished ? "Regenerate Summaries" : "Auto-Draft All"}
                </Button>
                <ResumePdfImport
                  variant="button"
                  onImported={handlePdfImported}
                  buttonLabel={isPublished ? "Re-upload Resume" : "Fill from Resume"}
                />
              </div>
            </div>
          </section>
        )}

        {/* Portal nudge: only the SRM Portal can fill in verified coursework, so
            offer it either right after a resume import or once per visit if it's
            still unlinked — dismissible ("ask me later"), never a blocking popup. */}
        <AnimatePresence>
          {nudgeReason && state.courses.length === 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {nudgeReason === "resume"
                        ? "Resume added! One more thing — link your SRM Portal?"
                        : "Want your verified coursework on your profile too?"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      We'll pull in your coursework so juniors can find you by course code too. Takes about 10 seconds, and your CGPA stays private.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismissPortalNudge}
                    className="text-xs text-muted-foreground"
                  >
                    Ask me later
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setPortalDialogOpen(true)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    Link Portal
                  </Button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Studio Grid: Left (Editor) & Right (Sticky Live Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: INTERACTIVE EDITOR */}
          <div
            className={`space-y-6 lg:col-span-7 ${
              activeMobileTab === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            {/* 1. Basic Identity */}
            <div id="section-basic-info" className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Basic Information</h3>
                    <p className="text-xs text-muted-foreground">How peers and professors identify you</p>
                  </div>
                </div>

                {/* Availability Switch */}
                <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50">
                  <span className="text-2xs font-semibold text-foreground">
                    {state.isAvailable ? "🟢 Available" : "⏸️ Paused"}
                  </span>
                  <Switch
                    checked={state.isAvailable}
                    onCheckedChange={(checked) => setState({ ...state, isAvailable: checked })}
                  />
                </div>
              </div>

              <ProfileAvatarUploader
                variant="inline"
                userId={user?.id || ""}
                name={state.name || profile?.name || ""}
                profileImage={profile?.profile_image || ""}
                onImageUpdated={() => refreshProfile()}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Full Name <span className="text-destructive">*</span></span>
                    {!state.name.trim() && <span className="text-xs text-destructive">Required</span>}
                  </label>
                  <Input
                    value={state.name}
                    onChange={(e) => setState({ ...state, name: e.target.value })}
                    placeholder="e.g. Usha Shah"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center justify-between">
                    <span>Department / Major <span className="text-destructive">*</span></span>
                    {!state.department.trim() && <span className="text-xs text-destructive">Required</span>}
                  </label>
                  <Input
                    value={state.department}
                    onChange={(e) => setState({ ...state, department: e.target.value })}
                    placeholder="e.g. Computer Science, Physics, Mechanical..."
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
                    <option value="">Select Year of Study</option>
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
                    <p className="text-xs text-muted-foreground">Appears below your name across CampusMind search results</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestTagline}
                  className="gap-1 text-2xs font-semibold text-primary hover:text-primary hover:bg-primary/10 h-7 px-2"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Suggest
                </Button>
              </div>

              <div className="space-y-2">
                <Input
                  value={state.tagline}
                  maxLength={120}
                  onChange={(e) => setState({ ...state, tagline: e.target.value })}
                  placeholder={`e.g. Helping peers with ${state.skills[0] || state.department || "coursework"}, problem solving & lab prep`}
                  className="text-sm font-medium"
                />
                <div className="flex items-center justify-between text-2xs text-muted-foreground pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">💡 Quick Ideas:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => {
                          const clean = formatDepartment(prev.department) || prev.department;
                          return {
                            ...prev,
                            tagline: `${clean ? `${clean} student` : "Student"} helping juniors with ${prev.skills[0] || "core subjects"} and lab work.`,
                          };
                        })
                      }
                      className="underline hover:text-foreground"
                    >
                      "Helping juniors master..."
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => {
                          const clean = formatDepartment(prev.department) || prev.department;
                          return {
                            ...prev,
                            tagline: `${clean ? `${clean} student` : "Student"} happy to review projects, coursework, and notes.`,
                          };
                        })
                      }
                      className="underline hover:text-foreground"
                    >
                      "Happy to review projects..."
                    </button>
                  </div>
                  <span className="tabular-nums">{state.tagline.length}/120</span>
                </div>
              </div>
            </div>

            {/* 3. Skills & Expertise */}
            <div id="section-skills" className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      Skills & Expertise
                      <span className="text-destructive text-xs">*</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">Classmates will discover you when searching these topics (min 2 needed)</p>
                  </div>
                </div>
                <span className={`text-2xs font-semibold ${
                  state.skills.length >= 2 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                }`}>
                  {state.skills.length} added {state.skills.length < 2 && "(min 2 needed)"}
                </span>
              </div>

              {/* Skill Pills */}
              <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2 rounded-xl bg-muted/40 border border-border/60">
                {state.skills.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic py-1 px-2">
                    No skills added yet. Add a few below or import your resume above!
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
                  placeholder="Type a skill and press Enter (e.g. Python, React, Machine Learning, Physics)..."
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
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      What I Can Help You Achieve
                    </h3>
                    <p className="text-xs text-muted-foreground">Concrete results students walk away with after messaging you</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestOutcomes}
                  className="gap-1 text-2xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-500/10 h-7 px-2"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Suggest
                </Button>
              </div>

              {/* Outcomes List */}
              <div className="space-y-2">
                {state.outcomes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No outcomes added yet. Click &ldquo;AI Suggest&rdquo; above to auto-generate!
                  </p>
                ) : (
                  state.outcomes.map((outcome, idx) => (
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
                  ))
                )}

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
                    placeholder="e.g. Master problem sets and lab experiments in my major"
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
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                      <MessageSquareCode className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      Ask Me Anything Topics
                    </h3>
                    <p className="text-xs text-muted-foreground">Conversational prompts for juniors reaching out</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestAma}
                  className="gap-1 text-2xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-500/10 h-7 px-2"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Suggest
                </Button>
              </div>

              {/* AMA Badges */}
              <div className="flex flex-wrap gap-2">
                {state.ask_me_anything.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No AMA topics added yet. Click &ldquo;AI Suggest&rdquo; above!
                  </p>
                ) : (
                  state.ask_me_anything.map((item, idx) => (
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
                  ))
                )}
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
                  placeholder="e.g. Core concepts, project ideas, exam strategy..."
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

            {/* 6. Perfect If You Are... (Ideal Mentees) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    6
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      Perfect If You Are... (Target Students)
                    </h3>
                    <p className="text-xs text-muted-foreground">Helps juniors know immediately if you are the right person to ask</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSuggestIdealMentees}
                  className="gap-1 text-2xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 h-7 px-2"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Suggest
                </Button>
              </div>

              {/* Ideal Mentees List */}
              <div className="space-y-2">
                {state.ideal_mentees.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No target descriptions added yet. Click &ldquo;AI Suggest&rdquo; above!
                  </p>
                ) : (
                  state.ideal_mentees.map((mentee, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-purple-500 shrink-0" />
                        {mentee}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIdealMentee(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}

                {/* Add Ideal Mentee */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newIdealMenteeInput}
                    onChange={(e) => setNewIdealMenteeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddIdealMentee();
                      }
                    }}
                    placeholder="e.g. 1st or 2nd year students taking courses in my major"
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddIdealMentee}
                    className="shrink-0 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Description
                  </Button>
                </div>
              </div>
            </div>

            {/* 7. Bio & Social Links */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  7
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Bio & Social Profiles</h3>
                  <p className="text-xs text-muted-foreground">Share your background and connect links</p>
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

            {/* 8. Privacy & CampusMind AI Discovery Consent */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  CampusMind AI Search Discovery
                </h4>
                <p className="text-xs text-muted-foreground">
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
                      {previewMentor.name || "Your Name"}
                    </h4>
                    <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                      <span className="font-semibold text-foreground/90">{state.department || "(Your Department)"}</span>
                      <span>•</span>
                      <span>{state.year_of_studies || "(Select Year)"}</span>
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

                {/* Simulated Connect Button & Availability */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={`flex h-2 w-2 rounded-full ${
                        state.isAvailable ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    {state.isAvailable ? "Available to help peers" : "Temporarily paused"}
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
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-teal-600" />
                    What I can help you achieve
                  </div>
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
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <MessageSquareCode className="h-3.5 w-3.5 text-sky-600" />
                    Ask me anything about
                  </div>
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

              {/* Simulated Perfect If You Are Preview */}
              {state.ideal_mentees.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-purple-600" />
                    Perfect if you are...
                  </div>
                  <div className="space-y-1">
                    {state.ideal_mentees.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-2xs text-foreground/90">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready to publish callout */}
              <div className="pt-3 border-t border-border/60">
                {!isPublished && !canPublish && (
                  <div className="mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      Required before publishing:
                    </div>
                    <ul className="list-disc list-inside text-2xs space-y-0.5 text-muted-foreground pl-1">
                      {!hasName && <li>Enter your full name</li>}
                      {!hasDepartment && <li>Enter your department / major</li>}
                      {state.skills.length < 2 && (
                        <li>Add at least 2 skills (currently {state.skills.length}) or import resume</li>
                      )}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={handlePublish}
                  disabled={isSaving || (!isPublished && !canPublish)}
                  className={`w-full gap-2 font-bold shadow-md py-5 text-sm ${
                    !isPublished && !canPublish
                      ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-80"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 stroke-[3]" />
                  )}
                  {isPublished
                    ? "Save & Update Profile"
                    : canPublish
                    ? "Publish Campus Profile"
                    : "Complete Missing Details to Publish"}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground mt-2">
                  {isPublished
                    ? "Your changes go live immediately across CampusMind search."
                    : "You can edit these details anytime from your profile page."}
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
        onSuccess={async (result) => {
          await refreshProfile();
          if (result) {
            setState((prev) => {
              const seen = new Map<string, string>();
              for (const s of result.subjects) if (!seen.has(s.code)) seen.set(s.code, s.name);
              return {
                ...prev,
                department: formatDepartment(result.program) || result.program || prev.department,
                courses: Array.from(seen, ([code, name]) => ({ code, name })),
              };
            });
          }
          setNudgeReason(null);
          toast.success("SRM Portal courses and academic details linked!");
        }}
      />

      {/* Post-Publish Link SRM Portal Popup */}
      <PostPublishPortalModal
        open={postPublishModalOpen}
        onOpenChange={setPostPublishModalOpen}
        userName={state.name}
        onLinkPortal={() => {
          setPostPublishModalOpen(false);
          setPortalDialogOpen(true);
        }}
        onViewProfile={() => {
          setPostPublishModalOpen(false);
          if (user?.id) {
            navigate(`/mentor/${user.id}`);
          }
        }}
      />
    </div>
  );
}
