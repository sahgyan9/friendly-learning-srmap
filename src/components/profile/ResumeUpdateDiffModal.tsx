import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles,
  CheckCircle2,
  FolderGit2,
  Briefcase,
  Zap,
  Tag,
  FileText,
  ArrowRight,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  HelpCircle,
  Check,
} from "lucide-react";
import { formatDepartment } from "@/utils/user-utils";

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

interface ResumeUpdateDiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentState: StudioProfileState;
  extractedData: Record<string, any> | null;
  onApplyChanges: (updates: Partial<StudioProfileState>) => void;
}

export default function ResumeUpdateDiffModal({
  open,
  onOpenChange,
  currentState,
  extractedData,
  onApplyChanges,
}: ResumeUpdateDiffModalProps) {
  if (!extractedData) return null;

  // Extract candidate new data with useMemo so object/array references are stable
  const rawSkills: string[] = useMemo(() => {
    if (Array.isArray(extractedData.skills)) return extractedData.skills;
    if (typeof extractedData.skills === "string" && extractedData.skills.trim()) {
      return extractedData.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [extractedData.skills]);

  const existingSkillsSet = useMemo(
    () => new Set(currentState.skills.map((s) => s.toLowerCase())),
    [currentState.skills]
  );

  const newDiscoveredSkills = useMemo(
    () => rawSkills.filter((s) => !existingSkillsSet.has(s.toLowerCase())),
    [rawSkills, existingSkillsSet]
  );

  const extractedProjects: ProjectItem[] = useMemo(() => {
    if (!Array.isArray(extractedData.projects)) return [];
    return extractedData.projects.map((p: any) => ({
      id: p.id || crypto.randomUUID(),
      title: p.title || "",
      description: p.description || "",
      link: p.link || undefined,
    }));
  }, [extractedData.projects]);

  const extractedExperiences: ExperienceItem[] = useMemo(() => {
    if (!Array.isArray(extractedData.experiences)) return [];
    return extractedData.experiences.map((e: any) => ({
      id: e.id || crypto.randomUUID(),
      title: e.title || "",
      organization: e.organization || undefined,
      period: e.period || undefined,
    }));
  }, [extractedData.experiences]);

  const newBio = typeof extractedData.bio === "string" ? extractedData.bio.trim() : "";
  const newTagline = typeof extractedData.tagline === "string" ? extractedData.tagline.trim() : "";
  const newYear = extractedData.year_of_studies || "";
  const newDept = formatDepartment(extractedData.department) || extractedData.department || "";

  // Selection states
  const [selectedNewSkills, setSelectedNewSkills] = useState<string[]>([]);
  const [taglineChoice, setTaglineChoice] = useState<"keep" | "replace">("keep");
  const [bioChoice, setBioChoice] = useState<"keep" | "replace">("keep");
  const [projectMode, setProjectMode] = useState<"append" | "replace" | "keep">("append");
  const [experienceMode, setExperienceMode] = useState<"append" | "replace" | "keep">("append");
  const [updateSummaries, setUpdateSummaries] = useState(false);
  const [updateIdentity, setUpdateIdentity] = useState(false);

  // Initialize defaults ONCE when the modal opens with new data
  useEffect(() => {
    if (open && extractedData) {
      setSelectedNewSkills(newDiscoveredSkills);
      setTaglineChoice(currentState.tagline ? "keep" : "replace");
      setBioChoice(currentState.bio ? "keep" : "replace");
      setProjectMode(
        currentState.projects.length > 0 && extractedProjects.length > 0
          ? "append"
          : extractedProjects.length > 0
          ? "replace"
          : "keep"
      );
      setExperienceMode(
        currentState.experiences.length > 0 && extractedExperiences.length > 0
          ? "append"
          : extractedExperiences.length > 0
          ? "replace"
          : "keep"
      );
      setUpdateSummaries(currentState.outcomes.length === 0);
      setUpdateIdentity(!currentState.department || !currentState.year_of_studies);
    }
  }, [open, extractedData]);

  const toggleSkill = (skill: string) => {
    setSelectedNewSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleApply = () => {
    const updates: Partial<StudioProfileState> = {};

    // 1. Skills
    if (selectedNewSkills.length > 0) {
      updates.skills = Array.from(new Set([...currentState.skills, ...selectedNewSkills]));
    }

    // 2. Projects
    if (projectMode === "replace") {
      updates.projects = extractedProjects.slice(0, 6);
    } else if (projectMode === "append") {
      const existingTitles = new Set(currentState.projects.map((p) => p.title.toLowerCase().trim()));
      const filteredNew = extractedProjects.filter((p) => !existingTitles.has(p.title.toLowerCase().trim()));
      updates.projects = [...currentState.projects, ...filteredNew].slice(0, 6);
    }

    // 3. Experiences
    if (experienceMode === "replace") {
      updates.experiences = extractedExperiences.slice(0, 6);
    } else if (experienceMode === "append") {
      const existingTitles = new Set(currentState.experiences.map((e) => e.title.toLowerCase().trim()));
      const filteredNew = extractedExperiences.filter((e) => !existingTitles.has(e.title.toLowerCase().trim()));
      updates.experiences = [...currentState.experiences, ...filteredNew].slice(0, 6);
    }

    // 4. Tagline
    if (taglineChoice === "replace" && newTagline) {
      updates.tagline = newTagline;
    }

    // 5. Bio
    if (bioChoice === "replace" && newBio) {
      updates.bio = newBio;
    }

    // 6. Identity
    if (updateIdentity) {
      if (newDept) updates.department = newDept;
      if (newYear) updates.year_of_studies = newYear;
      if (extractedData.name && !currentState.name) updates.name = extractedData.name;
    }

    // 7. Summaries & Topics
    if (updateSummaries) {
      if (Array.isArray(extractedData.outcomes) && extractedData.outcomes.length > 0) {
        updates.outcomes = extractedData.outcomes;
      }
      if (Array.isArray(extractedData.ask_me_anything) && extractedData.ask_me_anything.length > 0) {
        updates.ask_me_anything = extractedData.ask_me_anything.map((t: any) =>
          typeof t === "string" ? { topic: t } : t
        );
      }
      if (Array.isArray(extractedData.ideal_mentees) && extractedData.ideal_mentees.length > 0) {
        updates.ideal_mentees = extractedData.ideal_mentees;
      }
    }

    onApplyChanges(updates);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            Resume Update Comparison
          </div>
          <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground">
            Review What to Merge from Your Resume
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            We extracted new details from your resume. Choose which sections you want to merge or keep unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* 1. SKILLS SECTION */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span>Skills & Expertise</span>
                <Badge variant="outline" className="text-2xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {newDiscoveredSkills.length > 0 ? `+${newDiscoveredSkills.length} New Found` : "Up to date"}
                </Badge>
              </div>
              {newDiscoveredSkills.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNewSkills(newDiscoveredSkills)}
                    className="text-2xs text-primary underline font-medium"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedNewSkills([])}
                    className="text-2xs text-muted-foreground hover:text-foreground"
                  >
                    Deselect
                  </button>
                </div>
              )}
            </div>

            {newDiscoveredSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No new skills detected beyond your current {currentState.skills.length} skills.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-2xs text-muted-foreground">
                  Select newly discovered skills to add to your profile:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {newDiscoveredSkills.map((skill) => {
                    const isSelected = selectedNewSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                            : "bg-muted/40 border-border/60 text-muted-foreground line-through opacity-60"
                        }`}
                      >
                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-xs border text-[10px] ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "border-muted-foreground/40 bg-transparent"
                        }`}>
                          {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. FEATURED PROJECTS */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <FolderGit2 className="h-4 w-4 text-blue-500" />
                <span>Featured Projects</span>
                <Badge variant="outline" className="text-2xs">
                  {extractedProjects.length} Extracted from Resume
                </Badge>
              </div>

              {extractedProjects.length > 0 && (
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-2xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setProjectMode("append")}
                    className={`px-2 py-1 rounded-md transition-all ${
                      projectMode === "append"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Append (Merge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectMode("replace")}
                    className={`px-2 py-1 rounded-md transition-all ${
                      projectMode === "replace"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectMode("keep")}
                    className={`px-2 py-1 rounded-md transition-all ${
                      projectMode === "keep"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Keep Current
                  </button>
                </div>
              )}
            </div>

            {extractedProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">No projects found in this resume.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-2xs text-muted-foreground">
                  {projectMode === "append" && "Will append new projects without deleting your existing entries (max 6 total)."}
                  {projectMode === "replace" && "Will replace your current projects list with the newly extracted projects."}
                  {projectMode === "keep" && "Will leave your current projects list untouched."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {extractedProjects.map((p, i) => (
                    <div key={i} className="p-2 rounded-lg border border-border/60 bg-muted/20 text-2xs space-y-0.5">
                      <p className="font-bold text-foreground truncate">{p.title}</p>
                      <p className="text-muted-foreground line-clamp-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. EXPERIENCE & LEADERSHIP */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Briefcase className="h-4 w-4 text-amber-500" />
                <span>Experience & Roles</span>
                <Badge variant="outline" className="text-2xs">
                  {extractedExperiences.length} Extracted from Resume
                </Badge>
              </div>

              {extractedExperiences.length > 0 && (
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-2xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setExperienceMode("append")}
                    className={`px-2 py-1 rounded-md transition-all ${
                      experienceMode === "append"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Append (Merge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExperienceMode("replace")}
                    className={`px-2 py-1 rounded-md transition-all ${
                      experienceMode === "replace"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => setExperienceMode("keep")}
                    className={`px-2 py-1 rounded-md transition-all ${
                      experienceMode === "keep"
                        ? "bg-background text-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Keep Current
                  </button>
                </div>
              )}
            </div>

            {extractedExperiences.length === 0 ? (
              <p className="text-xs text-muted-foreground">No work experience found in this resume.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-2xs text-muted-foreground">
                  {experienceMode === "append" && "Will add new roles while keeping existing entries (max 6 total)."}
                  {experienceMode === "replace" && "Will replace existing entries with newly extracted roles."}
                  {experienceMode === "keep" && "Will leave existing experience untouched."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {extractedExperiences.map((e, i) => (
                    <div key={i} className="p-2 rounded-lg border border-border/60 bg-muted/20 text-2xs space-y-0.5">
                      <p className="font-bold text-foreground truncate">{e.title}</p>
                      {e.organization && <p className="text-muted-foreground">{e.organization}</p>}
                      {e.period && <p className="text-muted-foreground/80">{e.period}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. TAGLINE & BIO DIFF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tagline Card */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  <span>One-Line Tagline</span>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-2xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTaglineChoice("keep")}
                    className={`px-2 py-0.5 rounded-md ${taglineChoice === "keep" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    Keep Current
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaglineChoice("replace")}
                    className={`px-2 py-0.5 rounded-md ${taglineChoice === "replace" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    Use New
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-2xs">
                <div className={`p-2 rounded-lg border ${taglineChoice === "keep" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20 opacity-60"}`}>
                  <p className="font-bold text-foreground">Current:</p>
                  <p className="italic">{currentState.tagline || "(None set)"}</p>
                </div>
                <div className={`p-2 rounded-lg border ${taglineChoice === "replace" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20 opacity-60"}`}>
                  <p className="font-bold text-foreground">New Extracted:</p>
                  <p className="italic">{newTagline || "(No new tagline)"}</p>
                </div>
              </div>
            </div>

            {/* Bio Card */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span>Short Bio</span>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-2xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setBioChoice("keep")}
                    className={`px-2 py-0.5 rounded-md ${bioChoice === "keep" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    Keep Current
                  </button>
                  <button
                    type="button"
                    onClick={() => setBioChoice("replace")}
                    className={`px-2 py-0.5 rounded-md ${bioChoice === "replace" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                  >
                    Use New
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-2xs">
                <div className={`p-2 rounded-lg border ${bioChoice === "keep" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20 opacity-60"}`}>
                  <p className="font-bold text-foreground">Current:</p>
                  <p className="line-clamp-2">{currentState.bio || "(None set)"}</p>
                </div>
                <div className={`p-2 rounded-lg border ${bioChoice === "replace" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20 opacity-60"}`}>
                  <p className="font-bold text-foreground">New Extracted:</p>
                  <p className="line-clamp-2">{newBio || "(No new bio)"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. TOPICS & SUMMARIES TOGGLE */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-foreground">Update Mentoring Outcomes & AMA Topics</p>
              <p className="text-2xs text-muted-foreground">
                Regenerate your &ldquo;What I can help you achieve&rdquo; and &ldquo;Ask me anything&rdquo; topics to align with newly extracted skills.
              </p>
            </div>
            <Switch checked={updateSummaries} onCheckedChange={setUpdateSummaries} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel (Keep Everything)
          </Button>
          <Button size="sm" onClick={handleApply} className="text-xs font-bold gap-1.5 px-4 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            Apply Selected Updates
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
