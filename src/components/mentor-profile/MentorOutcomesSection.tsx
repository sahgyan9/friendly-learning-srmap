import { Check } from "lucide-react";
import { toast } from "sonner";

import EditableSection from "./EditableSection";
import StringListEditor from "./StringListEditor";
import { updateMentorSummary } from "@/integrations/supabase/services/mentors";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { Mentor } from "@/types/mentor";

interface MentorOutcomesSectionProps {
  mentor: EnhancedMentor;
  isOwnProfile: boolean;
  onMentorUpdated: (mentor: Mentor) => void;
}

/**
 * Two cards, each of which disappears when there is nothing real in it — and
 * each of which the mentor can edit in place.
 *
 * Both lists used to be templates in mentor-enhancements.ts that fired for
 * every mentor, so these cards were always full and always said the same thing.
 * They are now drafted from the mentor's own material, which makes two states
 * possible that were not before: empty (render nothing, never a placeholder)
 * and wrong (which is why the pencil exists — these are sentences published
 * under someone's real name, so they must be able to fix them).
 */
export default function MentorOutcomesSection({
  mentor,
  isOwnProfile,
  onMentorUpdated,
}: MentorOutcomesSectionProps) {
  const outcomes = mentor.outcomes;
  const topics = mentor.ask_me_anything;

  const showOutcomes = outcomes.length > 0 || isOwnProfile;
  const showTopics = topics.length > 0 || isOwnProfile;

  if (!showOutcomes && !showTopics) return null;

  const saveOutcomes = async (next: string[]) => {
    const cleaned = next.map((s) => s.trim()).filter(Boolean);
    const { data, error } = await updateMentorSummary(mentor.id, { outcomes: cleaned });
    if (error || !data) {
      toast.error("Could not save. Try again.");
      return false;
    }
    onMentorUpdated(data as unknown as Mentor);
    toast.success("Saved. This section will not be regenerated.");
    return true;
  };

  const saveTopics = async (next: string[]) => {
    const cleaned = next
      .map((s) => s.trim())
      .filter(Boolean)
      // Stored as objects for compatibility with older rows; the displayed
      // icon is always derived from the topic by getIconForTopic.
      .map((topic) => ({ topic }));
    const { data, error } = await updateMentorSummary(mentor.id, {
      ask_me_anything: cleaned,
    });
    if (error || !data) {
      toast.error("Could not save. Try again.");
      return false;
    }
    onMentorUpdated(data as unknown as Mentor);
    toast.success("Saved. This section will not be regenerated.");
    return true;
  };

  return (
    <div className="space-y-6">
      {showOutcomes && (
        <EditableSection<string[]>
          editable={isOwnProfile}
          title="What I can help you achieve"
          value={outcomes}
          onSave={saveOutcomes}
          renderEditor={(draft, setDraft) => (
            <StringListEditor
              items={draft}
              onChange={setDraft}
              maxItems={6}
              maxLength={120}
              placeholder="Get your first React app deployed"
              addLabel="Add an outcome"
              hint="Concrete things a student walks away with. Write the student's result, not a description of you."
            />
          )}
        >
          {outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Add what a student actually gets out of talking to you.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {outcomes.map((outcome, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {outcome}
                </li>
              ))}
            </ul>
          )}
        </EditableSection>
      )}

      {showTopics && (
        <EditableSection<string[]>
          editable={isOwnProfile}
          title="Ask me anything about"
          value={topics.map((t) => t.topic)}
          onSave={saveTopics}
          renderEditor={(draft, setDraft) => (
            <StringListEditor
              items={draft}
              onChange={setDraft}
              maxItems={8}
              maxLength={40}
              placeholder="RAG Pipelines"
              addLabel="Add a topic"
              hint="One to three words each. Pick what you are genuinely credible on — a long list helps nobody."
            />
          )}
        >
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add the handful of topics you are happy to be asked about.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {topics.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-foreground"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {item.topic}
                </li>
              ))}
            </ul>
          )}
        </EditableSection>
      )}
    </div>
  );
}
