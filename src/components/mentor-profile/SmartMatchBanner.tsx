import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Pencil, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import SkillsEditor from "./SkillsEditor";
import StringListEditor from "./StringListEditor";
import { updateMentorFields, updateMentorSummary } from "@/integrations/supabase/services/mentors";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { Mentor } from "@/types/mentor";

interface SmartMatchBannerProps {
  mentor: EnhancedMentor;
  isOwnProfile: boolean;
  onMentorUpdated: (mentor: Mentor) => void;
}

/**
 * A one-line summary of what this mentor works on.
 *
 * This used to be a "98% BEST MATCH FOR YOU" banner. The 98% was a hardcoded
 * literal -- not a score, not a computation, the same three characters on every
 * mentor's profile -- and "best match for you" was shown to every visitor
 * including signed-out ones, with no query and no comparison behind it. There
 * is no matching algorithm here to report on. (The `queryTopic` prop the old
 * component accepted was never read, which is the tell.)
 *
 * The skills themselves are real, so they stay; the invented score and the
 * personalised claim are gone.
 */
export default function SmartMatchBanner({ mentor, isOwnProfile, onMentorUpdated }: SmartMatchBannerProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Prefer the curated ask-me-anything topics over raw skills[].
  //
  // Mentors list a lot of skills -- four of the first eight on this site listed
  // 16 to 20 -- and slice(0, 3) returns whichever three they happened to type
  // first, which is usually the generic ones. That put "Specializes in Python,
  // C++, SQL" directly above an "Ask me anything about" card reading LLMs, RAG
  // Pipelines, Fine-tuning: the same profile disagreeing with itself, with the
  // less useful answer on top. The topics are the filtered set, so use them.
  //
  // Whichever list is actually on screen is also the one the pencil edits, so
  // a save always changes what the mentor just looked at.
  const usingTopics = mentor.ask_me_anything.length > 0;
  const sourceItems = usingTopics ? mentor.ask_me_anything.map((t) => t.topic) : mentor.skills || [];
  const topSkills = sourceItems.slice(0, 3);

  if (topSkills.length === 0 && !isOwnProfile) return null;

  const start = () => {
    setDraft(sourceItems);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(sourceItems);
    setEditing(false);
  };

  const save = async () => {
    const cleaned = draft.map((s) => s.trim()).filter(Boolean);
    setSaving(true);

    if (usingTopics) {
      const { data, error } = await updateMentorSummary(mentor.id, {
        ask_me_anything: cleaned.map((topic) => ({ topic })),
      });
      setSaving(false);
      if (error || !data) {
        toast.error("Could not save. Please try again.");
        return;
      }
      onMentorUpdated(data as unknown as Mentor);
      toast.success("Saved — this section is yours now and won't be regenerated.");
    } else {
      const { data, error } = await updateMentorFields(mentor.id, { skills: cleaned });
      setSaving(false);
      if (error || !data) {
        toast.error("Could not save your skills. Please try again.");
        return;
      }
      onMentorUpdated({ ...mentor, skills: cleaned } as unknown as Mentor);
      toast.success("Skills updated");
    }

    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex w-full items-start gap-3.5">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500 shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="w-full min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Specializes in
              </span>

              {isOwnProfile && !editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={start}
                  aria-label="Edit specializes in"
                  className="h-7 px-2 text-emerald-700/70 hover:text-emerald-700 dark:text-emerald-300/70 dark:hover:text-emerald-300"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3 pt-1">
                {usingTopics ? (
                  <StringListEditor
                    items={draft}
                    onChange={setDraft}
                    maxItems={8}
                    maxLength={40}
                    placeholder="RAG Pipelines"
                    addLabel="Add a topic"
                    hint="These are the topics from your &ldquo;Ask me anything about&rdquo; section further down — editing here updates that section too."
                  />
                ) : (
                  <SkillsEditor skills={draft} onChange={setDraft} />
                )}

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
                    <X className="mr-1 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            ) : topSkills.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Add a few skills so students immediately see what you specialize in.
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  {mentor.name?.split(" ")[0] || "This mentor"} can help with{" "}
                  {topSkills.join(", ")}.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {topSkills.map((sk) => (
                    <span
                      key={sk}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                      {sk}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
