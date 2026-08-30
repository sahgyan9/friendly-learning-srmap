import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Loader2,
  Check,
  ShieldCheck,
  Zap,
  Target,
  MessageSquareCode,
  Users,
  AlertCircle,
  UserRound,
  FolderGit2,
  Briefcase,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
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

        setState(initialSnapshot);
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
    toast.success(`Restored ${label} to your previously saved version`);
  };

  // One-click AI Auto-Draft for all sections
  const handleAutoDraftAll = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department and at least 1-2 skills, or import your resume first so AI has context.");
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
    toast.success("✨ AI summary drafts generated for Tagline, Outcomes, AMA, and Target Students!");
  };

  const handleSuggestTagline = () => {
    if (state.skills.length === 0 && !state.department.trim()) {
      toast.info("Please enter your department or at least 1 skill first.");
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
      toast.info("Please enter your department or at least 1 skill first.");
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
      toast.info("Please enter your department or at least 1 skill first.");
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
      toast.info("Please enter your department or at least 1 skill first.");
      return;
    }
    const drafts = generateSmartDrafts(state.skills, state.department, state.name);
    if (drafts.ideal_mentees.length > 0) {
      setState((prev) => ({ ...prev, ideal_mentees: drafts.ideal_mentees }));
      toast.success("💡 Target students suggested!");
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

    toast.success("Resume parsed! Skills, projects, and bio populated.");
    setNudgeReason("resume");
  };

  const handleApplyDiffUpdates = (updates: Partial<StudioProfileState>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
    }));
    toast.success("Resume updates merged! You can edit any field or revert individual sections anytime before saving.");
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
      toast.error("Please enter a project title");
      return;
    }
    if (state.projects.length >= 6) {
      toast.info("Maximum 6 projects allowed on your profile");
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
    toast.success("Project added!");
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
      toast.error("Please enter a role or achievement title");
      return;
    }
    if (state.experiences.length >= 6) {
      toast.info("Maximum 6 experiences allowed on your profile");
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
    toast.success("Experience added!");
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

  // Completeness score
  const completeness = useMemo(() => {
    const checks = [
      { label: "Photo / Avatar", done: Boolean(profile?.profile_image) },
      { label: "Tagline / Bio", done: Boolean(state.tagline?.trim() || state.bio?.trim()) },
      { label: "Skills (2+)", done: state.skills.length >= 2 },
      { label: "Projects / Experience", done: state.projects.length > 0 || state.experiences.length > 0 },
      {
        label: "Outcomes / Topics",
        done: state.outcomes.length > 0 || state.ask_me_anything.length > 0,
      },
      { label: "Target Students", done: state.ideal_mentees.length > 0 },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    const score = Math.round((doneCount / checks.length) * 100);
    return { score, checks };
  }, [state, profile]);

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

      const isPortalLinked = state.courses.length > 0 || Boolean(profile?.date_of_birth_linked);

      toast.success(
        isPublished
          ? "✓ Profile changes saved live!"
          : "🎉 Profile published live to Friendly Learning SRMAP!",
        { id: toastId }
      );

      if (!isPortalLinked) {
        setPostPublishModalOpen(true);
      } else {
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
    <div className="min-h-screen bg-muted/20 pb-24 pt-20">
      <SEOHead
        title={isPublished ? "Profile Studio | Friendly Learning SRMAP" : "Profile Setup Studio | Friendly Learning SRMAP"}
        description="Review, polish, and publish your campus profile."
      />

      {/* Top Sticky Header */}
      <header className="sticky top-16 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-xs">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
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
              className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isPublished ? "Back to Profile" : "Exit"}
              </span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5 truncate">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
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
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Preview Modal Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewModalOpen(true)}
              className="gap-1.5 text-xs font-semibold"
              title="Preview how students see your card on campus"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Preview Card</span>
            </Button>

            {!(nudgeReason && state.courses.length === 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPortalDialogOpen(true)}
                className="hidden md:flex gap-1.5 text-xs font-medium"
              >
                <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {state.courses.length > 0 ? `SRM Portal (${state.courses.length})` : "Link Portal"}
              </Button>
            )}

            <Button
              onClick={handlePublish}
              disabled={isSaving || (!isPublished && !canPublish)}
              size="sm"
              className={`gap-1.5 font-bold shadow-sm px-4 ${
                !isPublished && !canPublish
                  ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed opacity-75"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
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
                  : "Complete Info"}
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Full-Width Studio Container */}
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Unapplied Resume Recovery Banner (Shown when user returns after background parsing) */}
        {unappliedResume && (
          <section className="rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-purple-500/10 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/10">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base text-foreground">
                    Resume Parsed While You Were Away!
                  </span>
                  <span className="text-2xs font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/20">
                    {unappliedResume.fileName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gemini AI finished extracting your skills, projects, work experience & bio. Review the extracted data to merge with your profile.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  markParsingSessionApplied();
                  setUnappliedResume(null);
                }}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-bold gap-1.5 shadow-sm"
                onClick={() => {
                  const resumeData = unappliedResume.data;
                  markParsingSessionApplied();
                  setUnappliedResume(null);
                  handlePdfImported(resumeData);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Review & Apply Draft
              </Button>
            </div>
          </section>
        )}

        {/* Onboarding Kickstart / Mode Selector */}
        {!isPublished && completeness.score < 60 ? (
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-indigo-500/10 p-5 sm:p-6 shadow-xs">
            <div className="max-w-2xl space-y-1.5 mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-2xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Fast Setup
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-foreground">
                Import your resume or fill details below
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Upload your resume (PDF or .docx) to auto-extract skills, projects, experience, headline, and bio in ~5 seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Fast Resume Import */}
              <div className="rounded-xl border border-primary/40 bg-card p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-xs hover:border-primary transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-2xs font-extrabold bg-primary text-primary-foreground px-2 py-0.5 rounded-md uppercase tracking-wider">
                      ⚡ AI Auto-Fill
                    </span>
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Upload Resume (PDF / Word)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Gemini AI extracts your department, skills, projects, work experience, bio, and mentoring topics instantly.
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
                    Fill Step-by-Step
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Prefer entering details by hand? Scroll down to customize your bio, pick your skills, and add your projects.
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
          <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-indigo-500/5 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-2xs font-bold text-primary uppercase tracking-wider">
                  {isPublished ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Zap className="h-3 w-3" />}
                  {isPublished ? "Profile Management" : "Smart Auto-Draft"}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  {isPublished
                    ? "Update skills, re-sync resume, or refresh summaries"
                    : "Auto-fill your headline, outcomes, and topics with AI"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isPublished
                    ? "Upload a new resume to merge new skills & projects with a visual comparison, or auto-draft fresh summaries anytime."
                    : "Upload your resume or click Auto-Draft to generate tailored profile summaries."}
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

        {/* Portal nudge banner */}
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
                      We'll pull in your coursework so classmates can find you by course code too. Takes about 10 seconds, and your CGPA stays private.
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

        {/* 1. Basic Identity */}
        <div id="section-basic-info" className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                1
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">Basic Information</h3>
                <p className="text-xs text-muted-foreground">How peers and professors identify you on campus</p>
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
            <div className="flex items-center gap-2">
              {isSectionModified("tagline") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("tagline", "Tagline")}
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previous saved tagline"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Revert to saved
                </button>
              )}
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
            <div className="flex items-center gap-2">
              {isSectionModified("skills") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("skills", "Skills")}
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previous saved skills"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Revert skills
                </button>
              )}
              <span className={`text-2xs font-semibold ${
                state.skills.length >= 2 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              }`}>
                {state.skills.length} added {state.skills.length < 2 && "(min 2 needed)"}
              </span>
            </div>
          </div>

          {/* Skill Pills */}
          <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2.5 rounded-xl bg-muted/40 border border-border/60">
            {state.skills.length === 0 ? (
              <span className="text-xs text-muted-foreground italic py-1 px-2">
                No skills added yet. Add a few below, click quick suggestions, or import your resume!
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
              placeholder="Type skills (comma-separated, e.g. Python, React, Machine Learning) & press Enter..."
              className="text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAddSkillsFromInput(newSkillInput)}
              className="gap-1 font-semibold shrink-0"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Popular Skill Suggestions */}
          <div className="space-y-1.5 pt-1">
            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
              Popular at SRM AP:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS.filter((s) => !state.skills.includes(s)).slice(0, 8).map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleQuickAddSkill(skill)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border/50 text-muted-foreground transition-all"
                >
                  <Plus className="h-2.5 w-2.5" />
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Featured Projects */}
        <div id="section-projects" className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                4
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <FolderGit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Featured Projects
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
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previously saved projects"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
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
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center space-y-2 bg-muted/20">
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
                  Add First Project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/60 p-3.5 space-y-2 hover:border-blue-500/30 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
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
                        className="inline-flex items-center gap-1 text-2xs text-primary font-medium hover:underline truncate pt-1 border-t border-border/40"
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
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Add New Project</h4>
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
                    className="text-xs font-bold gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save Project
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Experience & Leadership */}
        <div id="section-experience" className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                5
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Experience & Leadership
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
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previously saved experience entries"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
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
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center space-y-2 bg-muted/20">
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
                  Add First Experience
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.experiences.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-start justify-between gap-2.5 rounded-xl border border-border/70 bg-background/60 p-3.5 hover:border-amber-500/30 transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
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
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Add Experience / Role</h4>
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
                    className="text-xs font-bold gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save Experience
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6. What I Can Help You Achieve (Outcomes) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs">
                6
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  What I Can Help You Achieve
                </h3>
                <p className="text-xs text-muted-foreground">Concrete results students walk away with after connecting with you</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("outcomes") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("outcomes", "Outcomes")}
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previously saved outcomes"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Revert outcomes
                </button>
              )}
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
          </div>

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

        {/* 7. Ask Me Anything Topics */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-xs">
                7
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquareCode className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Ask Me Anything Topics
                </h3>
                <p className="text-xs text-muted-foreground">Conversational prompts for peers reaching out</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("ask_me_anything") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("ask_me_anything", "AMA Topics")}
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previously saved AMA topics"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Revert AMA
                </button>
              )}
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
          </div>

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

        {/* 8. Perfect If You Are... (Ideal Mentees) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs">
                8
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Perfect If You Are... (Target Students)
                </h3>
                <p className="text-xs text-muted-foreground">Helps juniors know immediately if you are the right collaborator</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSectionModified("ideal_mentees") && (
                <button
                  type="button"
                  onClick={() => handleRevertSection("ideal_mentees", "Target Students")}
                  className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                  title="Restore to previously saved target students"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Revert target students
                </button>
              )}
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
          </div>

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
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                9
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">Bio & Social Profiles</h3>
                <p className="text-xs text-muted-foreground">Share your background and connect links</p>
              </div>
            </div>
            {isSectionModified("bio") && (
              <button
                type="button"
                onClick={() => handleRevertSection("bio", "Bio")}
                className="text-2xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md transition-colors"
                title="Restore to previous saved bio"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Revert bio
              </button>
            )}
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

        {/* 10. Privacy & CampusMind AI Discovery Consent */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              CampusMind AI Search Discovery
            </h4>
            <p className="text-xs text-muted-foreground">
              Allow fellow SRM AP students to discover you when searching for your skills, projects, department, or courses.
            </p>
          </div>
          <Switch
            checked={state.isDiscoverable}
            onCheckedChange={(checked) => setState({ ...state, isDiscoverable: checked })}
          />
        </div>

        {/* Missing requirements & Final Save/Publish Bar */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-4">
          {!isPublished && !canPublish && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-foreground">
                {isPublished ? "Ready to save your profile changes?" : "Ready to publish your campus profile?"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPublished
                  ? "Changes take effect live across CampusMind search immediately."
                  : "Classmates and juniors will be able to discover your skills and connect."}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewModalOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                Preview Card
              </Button>

              <Button
                onClick={handlePublish}
                disabled={isSaving || (!isPublished && !canPublish)}
                size="sm"
                className={`gap-1.5 font-bold shadow-md px-5 py-2.5 text-sm ${
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
                <span>
                  {isPublished
                    ? "Save Profile Changes"
                    : canPublish
                    ? "Publish Campus Profile"
                    : "Complete Required Info"}
                </span>
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
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Eye className="h-4 w-4 text-primary" />
              Live Campus Card Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This is how your profile appears to fellow SRM AP students across search and mentor discovery.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-4">
            {/* Header snippet */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
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
                      (Add a one-line tagline in Studio)
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${state.isAvailable ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {state.isAvailable ? "Available to help peers" : "Temporarily paused"}
                </span>
                <span className="text-2xs font-semibold text-muted-foreground">SRM AP Campus</span>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-foreground">Skills</div>
              <div className="flex flex-wrap gap-1">
                {state.skills.length === 0 ? (
                  <span className="text-2xs text-muted-foreground italic">No skills added</span>
                ) : (
                  state.skills.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-2xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
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
                <div className="text-xs font-bold text-foreground flex items-center gap-1">
                  <FolderGit2 className="h-3.5 w-3.5 text-blue-600" />
                  Projects ({state.projects.length})
                </div>
                <div className="space-y-1.5">
                  {state.projects.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-lg border border-border/60 bg-background text-xs space-y-0.5">
                      <div className="font-bold text-foreground">{p.title}</div>
                      <div className="text-2xs text-muted-foreground line-clamp-2">{p.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outcomes Snippet */}
            {state.outcomes.length > 0 && (
              <div className="space-y-1.5">
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
