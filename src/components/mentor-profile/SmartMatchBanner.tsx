import { useState } from "react";
import { Check, Pencil } from "lucide-react";
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
        toast.error("Could not save. Try again.");
        return;
      }
      onMentorUpdated(data as unknown as Mentor);
      toast.success("Saved. This section will not be regenerated.");
    } else {
      const { data, error } = await updateMentorFields(mentor.id, { skills: cleaned });
      setSaving(false);
      if (error || !data) {
        toast.error("Could not save your skills. Try again.");
        return;
      }
      onMentorUpdated({ ...mentor, skills: cleaned } as unknown as Mentor);
      toast.success("Skills saved.");
    }

    setEditing(false);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Specializes in</h2>
        {isOwnProfile && !editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={start}
            aria-label="Edit specializes in"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 pt-2">
          {usingTopics ? (
            <StringListEditor
              items={draft}
              onChange={setDraft}
              maxItems={8}
              maxLength={40}
              placeholder="RAG Pipelines"
              addLabel="Add a topic"
              hint="These are the topics from your &ldquo;Ask me anything about&rdquo; section further down. Editing here updates that section too."
            />
          ) : (
            <SkillsEditor skills={draft} onChange={setDraft} />
          )}

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} isLoading={saving}>
              {!saving && <Check />}
              Save
            </Button>
          </div>
        </div>
      ) : topSkills.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Add a few skills so students see what you specialize in.
        </p>
      ) : (
        <p className="mt-1 text-base text-foreground">
          {mentor.name?.split(" ")[0] || "This mentor"} can help with{" "}
          <span className="font-semibold">{topSkills.join(", ")}</span>.
        </p>
      )}
    </section>
  );
}
