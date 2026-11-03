import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine,
  ArrowLeft,
  Circle,
  FileUp,
  FileText,
  GraduationCap,
  Plus,
  Trash2,
  Eye,
  Loader2,
  Check,
  ShieldCheck,
  Target,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  MessageSquare,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ResumePdfImport from "@/components/mentors/form/ResumePdfImport";
import ResumeUpdateDiffModal from "@/components/profile/ResumeUpdateDiffModal";
import {
  getUnappliedParsedData,
  markParsingSessionApplied,
  clearParsingSession,
  subscribeToParsingSession,
} from "@/lib/resumeParserSession";
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";
import PostPublishPortalModal from "@/components/profile/PostPublishPortalModal";
import { ProfileAvatarUploader } from "@/components/profile/ProfileAvatarUploader";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { getMentorById, updateMentorSummary } from "@/integrations/supabase/services/mentors";
import { getEnhancedMentorProfile } from "@/utils/mentor-enhancements";
import { formatDepartment } from "@/utils/user-utils";
import SEOHead from "@/components/SEOHead";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  link?: string;
}

interface ExperienceItem {
  id: string;
  title: string;
  organization?: string;
  period?: string;
}

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
  projects: ProjectItem[];
  experiences: ExperienceItem[];
  isDiscoverable: boolean;
  isAvailable: boolean;
  courses: Array<{ code: string; name: string }>;
}

const POPULAR_SKILLS = [
  "Data Structures",
  "Python",
  "React",
  "TypeScript",
  "Machine Learning",
  "Web Development",
  "Physics",
  "Algorithms",
  "C++",
  "MATLAB",
  "Circuit Analysis",
  "SQL",
  "Competitive Programming",
  "AI & Deep Learning",
];

/**
 * Normalizes year of studies to match the studio select dropdown.
 */
function normalizeYearOfStudies(val: any): string {
  if (!val) return "";
  const s = String(val).trim().toLowerCase();
  if (s === "1" || s.startsWith("1st") || s.includes("first")) return "1st Year";
  if (s === "2" || s.startsWith("2nd") || s.includes("second")) return "2nd Year";
  if (s === "3" || s.startsWith("3rd") || s.includes("third")) return "3rd Year";
  if (s === "4" || s.startsWith("4th") || s.includes("fourth")) return "4th Year";
  if (s === "5" || s.startsWith("5th") || s.includes("fifth")) return "5th Year";
  if (s.includes("graduat") || s.includes("alumni")) return "Graduated";
  return String(val);
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

  const outcomes = [
    `Master problem sets, core theories, and practical intuition in ${skill1}`,
    `Get 1-on-1 guidance on ${skill2}, lab assignments, and project execution`,
    cleanDept
      ? `Prepare effectively for ${cleanDept} midterms, finals, and assessments`
      : `Prepare effectively for course assessments, exams, and project reviews`,
  ];

  const askMeAnything = (
    validSkills.length > 0
      ? validSkills.slice(0, 4)
      : [cleanDept || "Coursework", "Exam Prep", "Projects"]
  )
    .filter(Boolean)
    .map((s) => ({ topic: s }));

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

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [pendingResumeData, setPendingResumeData] = useState<Record<string, any> | null>(null);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [postPublishModalOpen, setPostPublishModalOpen] = useState(false);

  // Unapplied background-parsed resume state
  const [unappliedResume, setUnappliedResume] = useState<{
    jobId: string;
    fileName: string;
    data: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    // Check for existing unapplied resume parsed while user was away
    const unapplied = getUnappliedParsedData();
    if (unapplied) {
      setUnappliedResume(unapplied);
    }

    const unsubscribe = subscribeToParsingSession((session) => {
      if (session && session.status === "success" && session.data && !session.applied) {
        setUnappliedResume({
          jobId: session.jobId,
          fileName: session.fileName,
          data: session.data,
        });
      } else if (!session || session.applied) {
        setUnappliedResume(null);
      }
    });

    return unsubscribe;
  }, []);

  const [nudgeReason, setNudgeReason] = useState<"resume" | "visit" | null>(null);
  const initialNudgeCheckedRef = useRef(false);
  const hasAutoDraftedRef = useRef(false);
  const portalNudgeDismissKey = user ? `portal-nudge-dismissed-${user.id}` : null;

  // Baseline state loaded from database (for 1-click per-section revert)
  const [baselineState, setBaselineState] = useState<StudioProfileState | null>(null);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [targetExitPath, setTargetExitPath] = useState<string | null>(null);

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
    projects: [],
    experiences: [],
    isDiscoverable: true,
    isAvailable: true,
    courses: [],
  });

  // Track if current state differs from the database baseline
  const hasUnsavedChanges = useMemo(() => {
    if (!baselineState || loading) return false;
    return JSON.stringify(state) !== JSON.stringify(baselineState);
  }, [state, baselineState, loading]);

  // Continuously sync uncommitted draft to sessionStorage so navigating away never loses edits
  useEffect(() => {
    if (!user || loading || !baselineState) return;
    const draftKey = `fl_studio_profile_draft_${user.id}`;
    if (hasUnsavedChanges) {
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(state));
      } catch {}
    } else {
      try {
        sessionStorage.removeItem(draftKey);
      } catch {}
    }
  }, [state, hasUnsavedChanges, user, loading, baselineState]);

  // Browser-level safety net for tab close / reload
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have unsaved changes.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const [newSkillInput, setNewSkillInput] = useState("");
  const [newOutcomeInput, setNewOutcomeInput] = useState("");
  const [newAmaInput, setNewAmaInput] = useState("");
  const [newIdealMenteeInput, setNewIdealMenteeInput] = useState("");

  // Projects input state
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectLink, setNewProjectLink] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);

  // Experiences input state
  const [newExpTitle, setNewExpTitle] = useState("");
  const [newExpOrg, setNewExpOrg] = useState("");
  const [newExpPeriod, setNewExpPeriod] = useState("");
  const [showAddExp, setShowAddExp] = useState(false);

  // Load existing profile or mentor data on mount
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const { data: mentorData } = await getMentorById(user.id);

        let studentName = mentorData?.name || userData?.name || "";
        let studentDept = mentorData?.department || userData?.department || "";
        const studentYear = normalizeYearOfStudies(mentorData?.year_of_studies);
        let coursesList = Array.isArray(mentorData?.courses) ? (mentorData.courses as any[]) : [];

        if (coursesList.length === 0) {
          const { data: academicData } = await supabase
            .from("academic_imports")
            .select("subjects, program")
            .eq("user_id", user.id)
            .maybeSingle();

          if (academicData?.subjects && Array.isArray(academicData.subjects)) {
            const seen = new Map<string, string>();
            for (const s of academicData.subjects as any[]) {
              if (s?.code && !seen.has(s.code)) seen.set(s.code, s.name || s.code);
            }
            coursesList = Array.from(seen, ([code, name]) => ({ code, name }));
            if (!studentDept && academicData.program) {
              studentDept = formatDepartment(academicData.program) || academicData.program;
            }
          }
        }

        const mergedSkills = mentorData?.skills?.length
          ? mentorData.skills
          : userData?.skills || [];

        const alreadyPublished = Boolean(
          mentorData?.id && (mentorData.skills?.length ?? 0) > 0 && studentDept.trim().length > 0
        );
        setIsPublished(alreadyPublished);

        const currentTagline = mentorData?.tagline || "";
        const currentOutcomes = Array.isArray(mentorData?.outcomes) ? mentorData.outcomes : [];
        const currentAma = Array.isArray(mentorData?.ask_me_anything)
          ? mentorData.ask_me_anything.map((item: any) =>
              typeof item === "string" ? { topic: item } : item
            )
          : [];
        const currentIdealMentees = Array.isArray(mentorData?.ideal_mentees)
          ? mentorData.ideal_mentees
          : [];

        const currentProjects: ProjectItem[] = Array.isArray(mentorData?.projects)
          ? (mentorData.projects as any[]).map((p: any) => ({
              id: p.id || crypto.randomUUID(),
              title: p.title || "",
              description: p.description || "",
              link: p.link || undefined,
            }))
          : [];

        const currentExperiences: ExperienceItem[] = Array.isArray(mentorData?.experiences)
          ? (mentorData.experiences as any[]).map((e: any) => ({
              id: e.id || crypto.randomUUID(),
              title: e.title || "",
              organization: e.organization || undefined,
              period: e.period || undefined,
            }))
          : [];

        const initialSnapshot: StudioProfileState = {
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
          projects: currentProjects,
          experiences: currentExperiences,
          isDiscoverable: !alreadyPublished ? true : (userData?.interests_discoverable ?? true),
          isAvailable: mentorData?.is_available ?? true,
          courses: coursesList,
        };

        // Check if user had an unsaved local draft in sessionStorage from previous session
        const draftKey = `fl_studio_profile_draft_${user.id}`;
        let stateToSet = initialSnapshot;
        try {
          const savedDraftRaw = sessionStorage.getItem(draftKey);
          if (savedDraftRaw) {
            const parsedDraft = JSON.parse(savedDraftRaw);
            if (
              parsedDraft &&
              typeof parsedDraft === "object" &&
              JSON.stringify(parsedDraft) !== JSON.stringify(initialSnapshot)
            ) {
              stateToSet = { ...initialSnapshot, ...parsedDraft };
              toast.info("Restored your unsaved draft from the last session.");
            }
          }
        } catch {}

        setState(stateToSet);
        setBaselineState(initialSnapshot);
      } catch (err) {
        console.error("Error loading profile studio data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Prompt to link the SRM Portal once per visit if unlinked
  useEffect(() => {
    if (loading || initialNudgeCheckedRef.current || !user) return;
    initialNudgeCheckedRef.current = true;
    if (state.courses.length > 0 || Boolean(profile?.date_of_birth_linked)) return;
    if (portalNudgeDismissKey && sessionStorage.getItem(portalNudgeDismissKey)) return;
    setNudgeReason("visit");
  }, [loading, state.courses, user, portalNudgeDismissKey, profile?.date_of_birth_linked]);

  const handleDismissPortalNudge = () => {
    if (portalNudgeDismissKey) sessionStorage.setItem(portalNudgeDismissKey, "1");
    setNudgeReason(null);
  };

  // Studio auto-draft for blank profiles
  useEffect(() => {
    if (loading || isPublished || hasAutoDraftedRef.current) return;

    const courseTopics = state.courses.map((c) => c.name).filter(Boolean);
    const topics = state.skills.length > 0 ? state.skills : courseTopics;
    const hasDept = state.department.trim().length > 0;
    const allFourEmpty =
      !state.tagline.trim() &&
      state.outcomes.length === 0 &&
      state.ask_me_anything.length === 0 &&
      state.ideal_mentees.length === 0;

    if (!hasDept || topics.length === 0 || !allFourEmpty) return;

    hasAutoDraftedRef.current = true;
    const drafts = generateSmartDrafts(
      topics,
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
  }, [
    loading,
    isPublished,
    state.skills,
    state.courses,
    state.department,
    state.tagline,
    state.outcomes,
    state.ask_me_anything,
    state.ideal_mentees,
    state.name,
    state.bio,
    state.year_of_studies,
  ]);

  // Check if a specific section differs from the baseline snapshot
  const isSectionModified = (key: keyof StudioProfileState): boolean => {
    if (!baselineState) return false;
    if (key === "tagline") return state.tagline !== baselineState.tagline;
    if (key === "bio") return state.bio !== baselineState.bio;
    if (key === "skills") return JSON.stringify(state.skills) !== JSON.stringify(baselineState.skills);
    if (key === "projects") return JSON.stringify(state.projects) !== JSON.stringify(baselineState.projects);
    if (key === "experiences") return JSON.stringify(state.experiences) !== JSON.stringify(baselineState.experiences);
    if (key === "outcomes") return JSON.stringify(state.outcomes) !== JSON.stringify(baselineState.outcomes);
    if (key === "ask_me_anything") return JSON.stringify(state.ask_me_anything) !== JSON.stringify(baselineState.ask_me_anything);
    if (key === "ideal_mentees") return JSON.stringify(state.ideal_mentees) !== JSON.stringify(baselineState.ideal_mentees);
    return false;
  };

  // Revert a single section to its baseline saved value
  const handleRevertSection = (key: keyof StudioProfileState, label: string) => {
    if (!baselineState) return;
    setState((prev) => ({
      ...prev,
      [key]: baselineState[key],
    }));
    toast.success(`${label} restored to the saved version.`);
  };

  // One-click AI Auto-Draft for all sections
  const handleAutoDraftAll = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Add your department and at least 2 skills, or import your resume, before drafting.");
      return;
    }
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
    toast.success("Drafted tagline, outcomes, topics and who you help. Review them before publishing.");
  };

  const handleSuggestTagline = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Add your department or at least 1 skill first.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.tagline) {
      setState((prev) => ({ ...prev, tagline: drafts.tagline }));
      toast.success("Tagline drafted from your skills.");
    }
  };

  const handleSuggestOutcomes = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Add your department or at least 1 skill first.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.outcomes.length > 0) {
      setState((prev) => ({ ...prev, outcomes: drafts.outcomes }));
      toast.success("Outcomes drafted.");
    }
  };

  const handleSuggestAma = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Add your department or at least 1 skill first.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.ask_me_anything.length > 0) {
      setState((prev) => ({ ...prev, ask_me_anything: drafts.ask_me_anything }));
      toast.success("Topics drafted.");
    }
  };

  const handleSuggestIdealMentees = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Add your department or at least 1 skill first.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.ideal_mentees.length > 0) {
      setState((prev) => ({ ...prev, ideal_mentees: drafts.ideal_mentees }));
      toast.success("Drafted who you help.");
    }
  };

  // Handle PDF import structured extraction: Route existing profiles through Diff Modal
  const handlePdfImported = (data: Record<string, any>) => {
    const hasExistingData =
      isPublished ||
      state.skills.length > 0 ||
      state.tagline.trim().length > 0 ||
      state.projects.length > 0 ||
      state.bio.trim().length > 0;

    if (hasExistingData) {
      // Existing profile: Open comparison sheet
      setPendingResumeData(data);
      setDiffModalOpen(true);
    } else {
      // First-time empty setup: Apply directly
      applyDirectExtraction(data);
    }
  };

  const applyDirectExtraction = (data: Record<string, any>) => {
    setState((prev) => {
      const newSkills = Array.isArray(data.skills)
        ? data.skills
        : typeof data.skills === "string" && data.skills.trim()
        ? data.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      const mergedSkills = Array.from(new Set([...prev.skills, ...newSkills]));
      const rawDept = data.department || prev.department;
      const studentDept = formatDepartment(rawDept) || rawDept;
      const studentName = data.name || prev.name;
      const studentYear = normalizeYearOfStudies(data.year_of_studies || prev.year_of_studies);

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

      const extractedProjects: ProjectItem[] = Array.isArray(data.projects) && data.projects.length > 0
        ? data.projects.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            title: p.title || "",
            description: p.description || "",
            link: p.link || undefined,
          }))
        : prev.projects;

      const extractedExperiences: ExperienceItem[] = Array.isArray(data.experiences) && data.experiences.length > 0
        ? data.experiences.map((e: any) => ({
            id: e.id || crypto.randomUUID(),
            title: e.title || "",
            organization: e.organization || undefined,
            period: e.period || undefined,
          }))
        : prev.experiences;

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
        projects: extractedProjects,
        experiences: extractedExperiences,
      };
    });

    toast.success("Resume imported. Skills, projects and bio filled in.");
    setNudgeReason("resume");
  };

  const handleApplyDiffUpdates = (updates: Partial<StudioProfileState>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
    }));
    toast.success("Resume changes merged. Edit or revert any section before saving.");
    setNudgeReason("resume");
  };

  // Skill Handlers with comma-separated paste support
  const handleAddSkillsFromInput = (raw: string) => {
    const parts = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setState((prev) => {
      const set = new Set(prev.skills);
      parts.forEach((p) => set.add(p));
      return { ...prev, skills: Array.from(set) };
    });
    setNewSkillInput("");
  };

  const handleQuickAddSkill = (skill: string) => {
    if (state.skills.includes(skill)) return;
    setState((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Projects Handlers
  const handleAddProject = () => {
    const title = newProjectTitle.trim();
    const desc = newProjectDesc.trim();
    if (!title) {
      toast.error("Enter a project title.");
      return;
    }
    if (state.projects.length >= 6) {
      toast.info("You can list up to 6 projects.");
      return;
    }

    const trimmedLink = newProjectLink.trim();
    const normalizedLink = trimmedLink
      ? /^https?:\/\//i.test(trimmedLink)
        ? trimmedLink
        : `https://${trimmedLink}`
      : undefined;

    const newProject: ProjectItem = {
      id: crypto.randomUUID(),
      title,
      description: desc || "Project built during coursework or hackathons.",
      link: normalizedLink,
    };

    setState((prev) => ({ ...prev, projects: [...prev.projects, newProject] }));
    setNewProjectTitle("");
    setNewProjectDesc("");
    setNewProjectLink("");
    setShowAddProject(false);
    toast.success("Project added.");
  };

  const handleRemoveProject = (id: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  // Experiences Handlers
  const handleAddExperience = () => {
    const title = newExpTitle.trim();
    if (!title) {
      toast.error("Enter a role or achievement.");
      return;
    }
    if (state.experiences.length >= 6) {
      toast.info("You can list up to 6 experiences.");
      return;
    }

    const newExp: ExperienceItem = {
      id: crypto.randomUUID(),
      title,
      organization: newExpOrg.trim() || undefined,
      period: newExpPeriod.trim() || undefined,
    };

    setState((prev) => ({ ...prev, experiences: [...prev.experiences, newExp] }));
    setNewExpTitle("");
    setNewExpOrg("");
    setNewExpPeriod("");
    setShowAddExp(false);
    toast.success("Experience added.");
  };

  const handleRemoveExperience = (id: string) => {
    setState((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((e) => e.id !== id),
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

  // Live profile preview model
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
      projects: state.projects,
      experiences: state.experiences,
      rating: 5.0,
      review_count: 0,
      is_available: state.isAvailable,
      courses: state.courses,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
  }, [state, user, profile]);

  // Field errors appear once a field has been left or a publish was attempted,
  // not the moment the page opens with empty inputs.
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [publishAttempted, setPublishAttempted] = useState(false);
  const showFieldError = (field: string) => publishAttempted || Boolean(touchedFields[field]);
  const markFieldTouched = (field: string) =>
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  // Validation requirements for publishing
  const hasName = Boolean(state.name.trim());
  const hasDepartment = Boolean(state.department.trim());
  const hasSkills = state.skills.length >= 2;
  const canPublish = hasName && hasDepartment && hasSkills;

  const missingRequirements = useMemo(() => {
    const missing: string[] = [];
    if (!hasName) missing.push("Full name");
    if (!hasDepartment) missing.push("Department");
    if (state.skills.length === 0) {
      missing.push("2 skills");
    } else if (state.skills.length < 2) {
      missing.push("1 more skill");
    }
    return missing;
  }, [hasName, hasDepartment, state.skills]);

  // Completeness score
  const completeness = useMemo(() => {
    const checks = [
      { label: "Photo", section: "section-basic-info", done: Boolean(profile?.profile_image) },
      { label: "Tagline or bio", section: "section-tagline", done: Boolean(state.tagline?.trim() || state.bio?.trim()) },
      { label: "2+ skills", section: "section-skills", done: state.skills.length >= 2 },
      { label: "Projects or experience", section: "section-projects", done: state.projects.length > 0 || state.experiences.length > 0 },
      {
        label: "Outcomes or topics",
        section: "section-outcomes",
        done: state.outcomes.length > 0 || state.ask_me_anything.length > 0,
      },
      { label: "Who you help", section: "section-ideal", done: state.ideal_mentees.length > 0 },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    const score = Math.round((doneCount / checks.length) * 100);
    return { score, checks };
  }, [state, profile]);

  // Save and Publish Handler
  const handlePublish = async () => {
    setPublishAttempted(true);
    if (!user) {
      toast.error("Sign in to save your profile.");
      return;
    }

    if (!state.name.trim()) {
      toast.error("Enter your full name.");
      document.getElementById("section-basic-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!state.department.trim()) {
      toast.error("Enter your department or major.");
      document.getElementById("section-basic-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (state.skills.length < 2) {
      toast.error("Add at least 2 skills, or import your resume, so classmates can find you.");
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
        role: profile?.role === "admin" ? "admin" : profile?.role === "both" ? "both" : "mentor",
        verification_status: "approved",
      };

      const { error: userErr } = await supabase
        .from("users")
        .update(userUpdatePayload as any)
        .eq("id", user.id);

      if (userErr) throw userErr;

      // 2. Upsert into public.mentors
      const mentorPayload: Record<string, any> = {
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
        courses: state.courses,
        projects: state.projects.slice(0, 6),
        experiences: state.experiences.slice(0, 6),
      };

      if (state.isAvailable) {
        mentorPayload.available_from = null;
        mentorPayload.availability_note = null;
      }

      const { error: mentorErr } = await supabase
        .from("mentors")
        .upsert(mentorPayload as any, { onConflict: "id" });

      if (mentorErr) {
        console.warn("Mentor upsert note:", mentorErr);
      }

      // 3. Update summary fields
      await updateMentorSummary(user.id, {
        tagline: state.tagline.trim() || null,
        outcomes: state.outcomes.map((s) => s.trim()).filter(Boolean),
        ask_me_anything: state.ask_me_anything
          .map((a) => {
            const topicStr = typeof a === "string" ? a : a?.topic;
            return typeof topicStr === "string" ? { topic: topicStr.trim() } : null;
          })
          .filter((a): a is { topic: string } => Boolean(a && a.topic)),
        ideal_mentees: state.ideal_mentees.map((s) => s.trim()).filter(Boolean),
      });

      await refreshProfile();
      setBaselineState(state);
      setIsPublished(true);

      // Clean up session storage and parsing session now that data is safely in Postgres
      if (user) {
        try {
          sessionStorage.removeItem(`fl_studio_profile_draft_${user.id}`);
        } catch {}
      }
      markParsingSessionApplied();
      clearParsingSession();

      const isPortalLinked = state.courses.length > 0 || Boolean(profile?.date_of_birth_linked);

      toast.success(
        isPublished
          ? "Profile changes saved."
          : "Profile published to Friendly Learning SRMAP.",
        { id: toastId }
      );

      if (!isPortalLinked) {
        setPostPublishModalOpen(true);
      } else {
        setTimeout(() => {
          navigate(`/mentor/${user.id}`);
        }, 400);
      }
      return true;
    } catch (err: any) {
      console.error("Error publishing profile:", err);
      toast.error(err?.message || "Could not save your profile. Try again.", { id: toastId });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestExit = (targetPath?: string) => {
    const path = targetPath || (user?.id ? `/mentor/${user.id}` : "/");
    if (!hasUnsavedChanges) {
      navigate(path);
    } else {
      setTargetExitPath(path);
      setShowExitConfirmDialog(true);
    }
  };

  const handleSaveAndExit = async () => {
    const success = await handlePublish();
    if (success) {
      setShowExitConfirmDialog(false);
    }
  };

  const handleDiscardAndExit = () => {
    if (user) {
      try {
        sessionStorage.removeItem(`fl_studio_profile_draft_${user.id}`);
      } catch {}
    }
    clearParsingSession();
    setShowExitConfirmDialog(false);
    navigate(targetExitPath || (user?.id ? `/mentor/${user.id}` : "/"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <SEOHead
        title={isPublished ? "Profile Studio | Friendly Learning SRMAP" : "Profile Setup Studio | Friendly Learning SRMAP"}
        description="Review, polish, and publish your campus profile."
      />

      {/* Sticky so the progress row stays visible while scrolling through the
          sections it describes. It overlays content, hence the translucency. */}
      <header className="sticky top-16 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRequestExit()}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={isPublished ? "Back to profile" : "Exit"}
            >
              <ArrowLeft />
              <span className="hidden sm:inline">{isPublished ? "Profile" : "Exit"}</span>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                {isPublished ? "Edit profile" : "Set up your profile"}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {hasUnsavedChanges
                  ? "Unsaved changes"
                  : isPublished
                  ? "Published"
                  : canPublish
                  ? "Ready to publish"
                  : `${missingRequirements.length} required ${missingRequirements.length === 1 ? "item" : "items"} left`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewModalOpen(true)}
              aria-label="Preview card"
            >
              <Eye />
              <span className="hidden sm:inline">Preview</span>
            </Button>

            {!(nudgeReason && state.courses.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPortalDialogOpen(true)}
                className="hidden md:inline-flex"
              >
                <GraduationCap />
                {state.courses.length > 0 ? `SRM portal (${state.courses.length})` : "Link portal"}
              </Button>
            )}

            <Button
              onClick={handlePublish}
              isLoading={isSaving}
              disabled={isSaving || (!isPublished && !canPublish)}
              size="sm"
              title={!isPublished && !canPublish ? `Required: ${missingRequirements.join(", ")}` : undefined}
            >
              {!isSaving && <Check />}
              {isPublished ? "Save" : "Publish"}
            </Button>
          </div>
        </div>

        {/* Progress, labelled. Each item jumps to the section that completes it. */}
        <div className="mx-auto mt-3 flex max-w-4xl items-center gap-3">
          <span className="shrink-0 text-xs font-medium text-foreground tabular">
            {completeness.checks.filter((c) => c.done).length}/{completeness.checks.length}
          </span>
          <ol className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label="Profile progress">
            {completeness.checks.map((check) => (
              <li key={check.label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => document.getElementById(check.section)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors duration-150",
                    check.done
                      ? "border-transparent bg-secondary text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {check.done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Done" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" aria-label="Not done" />
                  )}
                  {check.label}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {/* Main Full-Width Studio Container */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Unapplied Resume Recovery Banner (Shown when user returns after background parsing) */}
        {unappliedResume && (
          <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-primary/30 bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5 animate-fade-up">
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Your resume finished importing
                </p>
                <p className="text-sm text-muted-foreground">
                  Skills, projects, experience and bio were read from <span className="font-medium text-foreground">{unappliedResume.fileName}</span>. Review them before they are merged.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  markParsingSessionApplied();
                  setUnappliedResume(null);
                }}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const resumeData = unappliedResume.data;
                  markParsingSessionApplied();
                  setUnappliedResume(null);
                  handlePdfImported(resumeData);
                }}
              >
                Review changes
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  {isPublished ? "Update from your resume" : "Fill this in from your resume"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload a PDF or .docx to fill in skills, projects, experience, tagline and bio. You review everything before it is saved.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
              <Button variant="outline" size="sm" onClick={handleAutoDraftAll}>
                <PenLine />
                Draft summary
              </Button>
              <ResumePdfImport
                variant="button"
                onImported={handlePdfImported}
                buttonLabel={isPublished ? "Re-upload resume" : "Upload resume"}
              />
            </div>
          </div>
        </section>

        {/* Portal nudge banner */}
        <AnimatePresence>
          {nudgeReason && state.courses.length === 0 && (
            <motion.section
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {nudgeReason === "resume"
                        ? "Resume added. Link your SRM portal as well?"
                        : "Add your coursework from the SRM portal"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Classmates can then find you by course code. It takes about 10 seconds, and your CGPA stays private.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismissPortalNudge}
                  >
                    Ask me later
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setPortalDialogOpen(true)}
                  >
                    <GraduationCap />
                    Link portal
                  </Button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* 1. Basic Identity */}
        <div id="section-basic-info" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                1
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Basic information</h3>
                <p className="text-xs text-muted-foreground">How peers and professors identify you on campus</p>
              </div>
            </div>

            {/* Availability Switch */}
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                <span className={cn("h-2 w-2 rounded-full", state.isAvailable ? "bg-emerald-500" : "bg-amber-500")} />
                {state.isAvailable ? "Available" : "Paused"}
              </span>
              <Switch
                checked={state.isAvailable}
                onCheckedChange={(checked) => setState({ ...state, isAvailable: checked })}
                aria-label="Available for messages"
              />
            </label>
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
              <label htmlFor="studio-name" className="text-sm font-medium text-foreground">
                Full name <span className="text-destructive" aria-hidden>*</span>
              </label>
              <Input
                id="studio-name"
                value={state.name}
                onChange={(e) => setState({ ...state, name: e.target.value })}
                onBlur={() => markFieldTouched("name")}
                placeholder="e.g. Usha Shah"
                aria-invalid={showFieldError("name") && !hasName}
                aria-describedby={showFieldError("name") && !hasName ? "studio-name-error" : undefined}
                className={cn("text-sm", showFieldError("name") && !hasName && "border-destructive focus-visible:ring-destructive")}
              />
              {showFieldError("name") && !hasName && (
                <p id="studio-name-error" className="text-xs text-destructive">Enter your full name.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="studio-department" className="text-sm font-medium text-foreground">
                Department or major <span className="text-destructive" aria-hidden>*</span>
              </label>
              <Input
                id="studio-department"
                value={state.department}
                onChange={(e) => setState({ ...state, department: e.target.value })}
                onBlur={() => markFieldTouched("department")}
                placeholder="e.g. Computer Science, Physics, Mechanical"
                aria-invalid={showFieldError("department") && !hasDepartment}
                aria-describedby={showFieldError("department") && !hasDepartment ? "studio-department-error" : undefined}
                className={cn("text-sm", showFieldError("department") && !hasDepartment && "border-destructive focus-visible:ring-destructive")}
              />
              {showFieldError("department") && !hasDepartment && (
                <p id="studio-department-error" className="text-xs text-destructive">Enter your department or major.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Year of study</label>
              <select
                value={state.year_of_studies}
                onChange={(e) => setState({ ...state, year_of_studies: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="">Select year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
                <option value="Graduated">Graduated / Alumni</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">University</label>
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
        <div id="section-tagline" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                2
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Tagline
                </h3>
                <p className="text-xs text-muted-foreground">One line shown under your name in search results</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("tagline") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("tagline", "Tagline")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previous saved tagline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert to saved
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestTagline}
                className="text-muted-foreground hover:text-foreground"
              >
                <PenLine />
                Draft
              </Button>
            </div>
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
                <span className="font-medium">Examples:</span>
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
        <div id="section-skills" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                3
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  Skills
                  <span className="text-destructive text-xs" aria-hidden>*</span>
                </h3>
                <p className="text-xs text-muted-foreground">Classmates find you by these. Add at least 2.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("skills") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("skills", "Skills")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previous saved skills"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert skills
                </button>
              )}
              <span className={`text-xs tabular ${
                state.skills.length >= 2 ? "text-muted-foreground" : showFieldError("skills") ? "text-destructive" : "text-muted-foreground"
              }`}>
                {state.skills.length} added
              </span>
            </div>
          </div>

          {/* Skill Pills */}
          <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-border bg-muted/40 p-2.5">
            {state.skills.length === 0 ? (
              <span className="px-2 py-1 text-sm text-muted-foreground">
                No skills yet. Type them below, pick from the list, or import your resume.
              </span>
            ) : (
              state.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
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
              onBlur={() => markFieldTouched("skills")}
              aria-label="Add skills"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  handleAddSkillsFromInput(newSkillInput);
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text && (text.includes(",") || text.includes("\n"))) {
                  e.preventDefault();
                  handleAddSkillsFromInput(text);
                }
              }}
              placeholder="Python, React, Machine Learning (press Enter)"
              className="text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddSkillsFromInput(newSkillInput)}
              className="shrink-0"
              disabled={!newSkillInput.trim()}
            >
              <Plus />
              Add
            </Button>
          </div>
          {showFieldError("skills") && state.skills.length < 2 && (
            <p className="text-xs text-destructive">
              Add {2 - state.skills.length} more {2 - state.skills.length === 1 ? "skill" : "skills"} to publish.
            </p>
          )}

          {/* Popular Skill Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-medium text-muted-foreground">
              Popular at SRM AP
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.filter((s) => !state.skills.includes(s)).slice(0, 8).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleQuickAddSkill(skill)}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Featured Projects */}
        <div id="section-projects" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                4
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Projects
                  <span className="text-xs font-normal text-muted-foreground">({state.projects.length}/6)</span>
                </h3>
                <p className="text-xs text-muted-foreground">Showcase key projects from hackathons, courses, or personal research</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSectionModified("projects") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("projects", "Projects")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previously saved projects"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert projects
                </button>
              )}
              {!showAddProject && state.projects.length < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProject(true)}
                  className="gap-1 text-xs font-semibold h-7 px-2.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Project
                </Button>
              )}
            </div>
          </div>

          {/* Project List */}
          <div className="space-y-2.5">
            {state.projects.length === 0 && !showAddProject ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  No projects added yet. Import your resume to auto-fill or add one manually!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProject(true)}
                  className="gap-1 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add a project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 space-y-2 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {proj.title}
                        </h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveProject(proj.id)}
                          aria-label={`Remove ${proj.title}`}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {proj.description}
                      </p>
                    </div>

                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-2xs text-primary font-medium hover:underline truncate pt-1 border-t border-border"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{proj.link}</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Project Form Drawer / Inset */}
            {showAddProject && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">New project</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddProject(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <Input
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="Project title (e.g. Autonomous Drone Simulator)"
                    className="text-xs font-semibold"
                  />
                  <Textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    rows={2}
                    placeholder="What did you build, what stack did you use, and what problem did it solve?"
                    className="text-xs resize-none"
                  />
                  <Input
                    value={newProjectLink}
                    onChange={(e) => setNewProjectLink(e.target.value)}
                    placeholder="GitHub repo or live demo URL (optional)"
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddProject(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddProject}
                    disabled={!newProjectTitle.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add project
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Experience & Leadership */}
        <div id="section-experience" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                5
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Experience and leadership
                  <span className="text-xs font-normal text-muted-foreground">({state.experiences.length}/6)</span>
                </h3>
                <p className="text-xs text-muted-foreground">Internships, club positions, research labs, or teaching assistance</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSectionModified("experiences") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("experiences", "Experience")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previously saved experience entries"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert experience
                </button>
              )}
              {!showAddExp && state.experiences.length < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddExp(true)}
                  className="gap-1 text-xs font-semibold h-7 px-2.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Role
                </Button>
              )}
            </div>
          </div>

          {/* Experience List */}
          <div className="space-y-2.5">
            {state.experiences.length === 0 && !showAddExp ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  No experience entries added yet. Import your resume to auto-fill or add one manually!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddExp(true)}
                  className="gap-1 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add an experience
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between gap-2.5 rounded-lg border border-border bg-card p-3.5 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {exp.title}
                      </h4>
                      {exp.organization && (
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {exp.organization}
                        </p>
                      )}
                      {exp.period && (
                        <p className="text-2xs text-muted-foreground/80">
                          {exp.period}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(exp.id)}
                      aria-label={`Remove ${exp.title}`}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Experience Form Inset */}
            {showAddExp && (
              <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground">New role or achievement</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddExp(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <Input
                    value={newExpTitle}
                    onChange={(e) => setNewExpTitle(e.target.value)}
                    placeholder="Role title (e.g. Teaching Assistant, Lead Developer)"
                    className="text-xs font-semibold sm:col-span-1"
                  />
                  <Input
                    value={newExpOrg}
                    onChange={(e) => setNewExpOrg(e.target.value)}
                    placeholder="Organization / Lab / Club (optional)"
                    className="text-xs sm:col-span-1"
                  />
                  <Input
                    value={newExpPeriod}
                    onChange={(e) => setNewExpPeriod(e.target.value)}
                    placeholder="Period, e.g. 2024 - Present"
                    className="text-xs sm:col-span-1"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddExp(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddExperience}
                    disabled={!newExpTitle.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add experience
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. What I Can Help You Achieve (Outcomes) */}
        <div id="section-outcomes" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                6
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  What students get from you
                </h3>
                <p className="text-xs text-muted-foreground">Concrete results students walk away with after connecting with you</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("outcomes") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("outcomes", "Outcomes")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previously saved outcomes"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert outcomes
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestOutcomes}
                className="text-muted-foreground hover:text-foreground"
              >
                <PenLine />
                Draft
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {state.outcomes.length === 0 ? (
              <p className="py-1 text-sm text-muted-foreground">
                No outcomes added yet. Click &ldquo;AI Suggest&rdquo; above to auto-generate!
              </p>
            ) : (
              state.outcomes.map((outcome, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-muted/20 text-xs text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
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
                Add outcome
              </Button>
            </div>
          </div>
        </div>

        {/* 7. Ask Me Anything Topics */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                7
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Topics to ask you about
                </h3>
                <p className="text-xs text-muted-foreground">Conversational prompts for peers reaching out</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("ask_me_anything") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("ask_me_anything", "AMA Topics")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previously saved AMA topics"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert AMA
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestAma}
                className="text-muted-foreground hover:text-foreground"
              >
                <PenLine />
                Draft
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {state.ask_me_anything.length === 0 ? (
              <p className="py-1 text-sm text-muted-foreground">
                No AMA topics added yet. Use Draft above, or add one below.
              </p>
            ) : (
              state.ask_me_anything.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {item.topic}
                  <button
                    type="button"
                    onClick={() => handleRemoveAma(idx)}
                    aria-label={`Remove ${item.topic}`}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>

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
              Add topic
            </Button>
          </div>
        </div>

        {/* 8. Perfect If You Are... (Ideal Mentees) */}
        <div id="section-ideal" className="scroll-mt-44 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                8
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
                  Who you can help
                </h3>
                <p className="text-xs text-muted-foreground">Helps juniors know immediately if you are the right collaborator</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("ideal_mentees") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("ideal_mentees", "Who you help")}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Restore to previously saved target students"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revert target students
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSuggestIdealMentees}
                className="text-muted-foreground hover:text-foreground"
              >
                <PenLine />
                Draft
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {state.ideal_mentees.length === 0 ? (
              <p className="py-1 text-sm text-muted-foreground">
                No target descriptions added yet. Use Draft above, or add one below.
              </p>
            ) : (
              state.ideal_mentees.map((mentee, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-muted/20 text-xs text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
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

        {/* 9. Bio & Social Links */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                9
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Bio and links</h3>
                <p className="text-xs text-muted-foreground">Share your background and connect links</p>
              </div>
            </div>
            {isSectionModified("bio") && (
              <button
                type="button"
                onClick={() => handleRevertSection("bio", "Bio")}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Restore to previous saved bio"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revert bio
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Short bio (2 to 3 sentences)</label>
              <Textarea
                value={state.bio}
                onChange={(e) => setState({ ...state, bio: e.target.value })}
                rows={3}
                placeholder="Tell peers what you're passionate about, your recent projects, or how you like to collaborate..."
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">LinkedIn URL</label>
              <Input
                value={state.linkedin_url}
                onChange={(e) => setState({ ...state, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* 10. Privacy & CampusBrain AI Discovery Consent */}
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="space-y-1">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Show me in search
            </h4>
            <p className="text-xs text-muted-foreground">
              Allow fellow SRM AP students to discover you when searching for your skills, projects, department, or courses.
            </p>
          </div>
          <Switch
            checked={state.isDiscoverable}
            onCheckedChange={(checked) => setState({ ...state, isDiscoverable: checked })}
          />
        </label>

        {/* Missing requirements & Final Save/Publish Bar */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-card space-y-4">
          {!isPublished && !canPublish && (
            <div className="space-y-1.5 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/20" role="status">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Required before publishing
              </div>
              <ul className="list-inside list-disc space-y-0.5 pl-1 text-muted-foreground">
                {!hasName && <li>Enter your full name</li>}
                {!hasDepartment && <li>Enter your department or major</li>}
                {state.skills.length < 2 && (
                  <li>Add at least 2 skills (you have {state.skills.length}), or import your resume</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {isPublished ? "Save your changes" : "Publish your profile"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isPublished
                  ? "Changes appear in search as soon as they are saved."
                  : "Classmates and juniors can then find you by skill and message you."}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button variant="outline" onClick={() => setPreviewModalOpen(true)}>
                <Eye />
                Preview
              </Button>

              <Button
                onClick={handlePublish}
                isLoading={isSaving}
                disabled={isSaving || (!isPublished && !canPublish)}
              >
                {!isSaving && <Check />}
                {isPublished ? "Save changes" : "Publish profile"}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Resume Update Diff Review Modal (Non-Destructive Comparison) */}
      <ResumeUpdateDiffModal
        open={diffModalOpen}
        onOpenChange={setDiffModalOpen}
        currentState={state}
        extractedData={pendingResumeData}
        onApplyChanges={handleApplyDiffUpdates}
      />

      {/* Quick Preview Modal (Opens on Demand) */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-xl sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Card preview
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              How your profile appears to other SRM AP students in search and the mentor directory.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            {/* Header snippet */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start gap-3.5">
                <MentorAvatar
                  name={previewMentor.name}
                  src={previewMentor.profile_image}
                  seed={previewMentor.id}
                  className="h-12 w-12"
                  fallbackClassName="text-base"
                />
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="truncate text-base font-semibold text-foreground">
                    {previewMentor.name || "Your name"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {[state.department || "Department", state.year_of_studies || "Year", state.university].filter(Boolean).join(" · ")}
                  </p>
                  {state.tagline ? (
                    <p className="line-clamp-2 pt-0.5 text-sm text-foreground">
                      {state.tagline}
                    </p>
                  ) : (
                    <p className="pt-0.5 text-sm text-muted-foreground">
                      No tagline yet
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${state.isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {state.isAvailable ? "Available" : "Paused"}
                </span>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <div className="text-sm font-medium text-foreground">Skills</div>
              <div className="flex flex-wrap gap-1">
                {state.skills.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No skills added</span>
                ) : (
                  state.skills.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="px-2 py-0.5 text-xs font-normal"
                    >
                      {s}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Projects Snippet */}
            {state.projects.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-foreground">
                  Projects <span className="text-muted-foreground tabular">{state.projects.length}</span>
                </div>
                <div className="space-y-1.5">
                  {state.projects.map((p) => (
                    <div key={p.id} className="space-y-0.5 rounded-lg border border-border p-2.5 text-xs">
                      <div className="font-medium text-foreground">{p.title}</div>
                      <div className="text-2xs text-muted-foreground line-clamp-2">{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outcomes Snippet */}
            {state.outcomes.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-sm font-medium text-foreground">
                  What students get from you
                </div>
                <div className="space-y-1">
                  {state.outcomes.map((o, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-2xs text-foreground/90">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              Leave without saving?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Your edits to skills, projects, experience or the resume draft have not been saved. If you leave now, your public profile keeps its previous version.
            </DialogDescription>
          </DialogHeader>

          {/* Discard sits apart on the left so it is not hit by reflex. */}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleDiscardAndExit}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
            >
              Discard changes
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setShowExitConfirmDialog(false)}
                className="w-full sm:w-auto"
              >
                Keep editing
              </Button>
              <Button
                onClick={handleSaveAndExit}
                isLoading={isSaving}
                disabled={isSaving || (!isPublished && !canPublish)}
                className="w-full sm:w-auto"
              >
                {!isSaving && <Check />}
                Save and leave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          toast.success("SRM portal linked. Courses and academic details added.");
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
