import { motion } from "framer-motion";
import { CheckCircle2, MessageSquareCode, Target } from "lucide-react";
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
      toast.error("Could not save. Please try again.");
      return false;
    }
    onMentorUpdated(data as unknown as Mentor);
    toast.success("Saved — this section is yours now and won't be regenerated.");
    return true;
  };

  const saveTopics = async (next: string[]) => {
    const cleaned = next
      .map((s) => s.trim())
      .filter(Boolean)
      // Stored as objects so a mentor-chosen icon stays possible; the icon is
      // filled in by the emoji lookup when absent.
      .map((topic) => ({ topic }));
    const { data, error } = await updateMentorSummary(mentor.id, {
      ask_me_anything: cleaned,
    });
    if (error || !data) {
      toast.error("Could not save. Please try again.");
      return false;
    }
    onMentorUpdated(data as unknown as Mentor);
    toast.success("Saved — this section is yours now and won't be regenerated.");
    return true;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {showOutcomes && (
        <EditableSection<string[]>
          editable={isOwnProfile}
          title="What I can help you achieve"
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Target className="h-4 w-4" />
            </div>
          }
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
            <p className="text-sm italic text-muted-foreground">
              Nothing here yet. Add what a student actually gets out of talking to you.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Concrete outcomes you can reach through mentoring sessions
              </p>
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                {outcomes.map((outcome, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3.5 transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/5"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <span className="text-sm font-medium leading-snug text-foreground">
                      {outcome}
                    </span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </EditableSection>
      )}

      {showTopics && (
        <EditableSection<string[]>
          editable={isOwnProfile}
          title="Ask me anything about"
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquareCode className="h-4 w-4" />
            </div>
          }
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
            <p className="text-sm italic text-muted-foreground">
              Add the handful of topics you are happy to be asked about.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Topics and areas we can discuss in chat
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {topics.map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="flex cursor-default items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground shadow-xs transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.topic}</span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </EditableSection>
      )}
    </motion.div>
  );
}
