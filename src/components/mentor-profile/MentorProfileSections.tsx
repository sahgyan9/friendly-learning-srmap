import { motion } from "framer-motion";
import { Award, Heart, MessageSquareQuote, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

import BadgeDisplay from "@/components/badges/BadgeDisplay";
import ReviewsList from "@/components/rating/ReviewsList";
import EditableSection from "./EditableSection";
import SkillsEditor from "./SkillsEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateMentorFields, type EditableMentorFields } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";

interface MentorProfileSectionsProps {
  mentor: Mentor;
  canRate: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
  onMentorUpdated: (mentor: Mentor) => void;
}

/**
 * The scrolling half of the profile: About, skills, badges and reviews, each in
 * its own card.
 *
 * Everything used to run together in one column of unlabelled text and badges,
 * so a visitor deciding whether to message someone had to read the whole page
 * to find the one thing they cared about. Cards with headings let them skip.
 */
const MentorProfileSections = ({
  mentor,
  canRate,
  isOwnProfile,
  ratingLoading,
  onShowRatingModal,
  onMentorUpdated,
}: MentorProfileSectionsProps) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  /**
   * Applies the change locally only once the write succeeds, so a rejected save
   * cannot leave the page showing text that is not in the database.
   */
  const saveFields = async (fields: EditableMentorFields, label: string) => {
    const { data, error } = await updateMentorFields(mentor.id, fields);

    if (error || !data) {
      toast.error(`Could not save your ${label}. Please try again.`);
      return false;
    }

    onMentorUpdated({ ...mentor, ...fields });
    toast.success(`${label[0].toUpperCase()}${label.slice(1)} updated`);
    return true;
  };

  return (
    <div className="space-y-6">
      <motion.div variants={itemVariants}>
        <EditableSection<string>
          editable={isOwnProfile}
          title="About"
          icon={<MessageSquareQuote className="h-4 w-4 text-primary" />}
          value={mentor.bio || ""}
          onSave={(bio) => saveFields({ bio: bio.trim() }, "bio")}
          renderEditor={(draft, setDraft) => (
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={6}
              placeholder="What are you good at, and what can juniors ask you about?"
              className="resize-y"
            />
          )}
        >
          {mentor.bio ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {mentor.bio}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {isOwnProfile
                ? "You haven't written an intro yet. Students read this first."
                : "This mentor hasn't written an intro yet."}
            </p>
          )}
        </EditableSection>
      </motion.div>

      <motion.div variants={itemVariants}>
        <EditableSection<string[]>
          editable={isOwnProfile}
          title="Can help you with"
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          value={mentor.skills || []}
          onSave={(skills) => saveFields({ skills }, "skills")}
          renderEditor={(draft, setDraft) => <SkillsEditor skills={draft} onChange={setDraft} />}
        >
          {mentor.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {mentor.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {isOwnProfile
                ? "Add the topics you can help with so students can find you."
                : "No skills listed yet."}
            </p>
          )}
        </EditableSection>
      </motion.div>

      {/* Hidden from visitors when empty — an "Interests" heading over nothing
          is noise. The owner still sees it, as the prompt to fill it in. */}
      {(mentor.hobbies || isOwnProfile) && (
        <motion.div variants={itemVariants}>
          <EditableSection<string>
            editable={isOwnProfile}
            title="Interests"
            icon={<Heart className="h-4 w-4 text-primary" />}
            value={mentor.hobbies || ""}
            onSave={(hobbies) => saveFields({ hobbies: hobbies.trim() }, "interests")}
            renderEditor={(draft, setDraft) => (
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Football, photography, open source…"
              />
            )}
          >
            {mentor.hobbies ? (
              <p className="text-sm text-muted-foreground">{mentor.hobbies}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Add a few interests — it gives students an easier way to open a conversation.
              </p>
            )}
          </EditableSection>
        </motion.div>
      )}

      <motion.section
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
        variants={itemVariants}
      >
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
          <Award className="h-4 w-4 text-primary" />
          Badges
        </h2>
        <BadgeDisplay userId={mentor.id} />
      </motion.section>

      <motion.section
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
        variants={itemVariants}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Star className="h-4 w-4 text-primary" />
            Reviews
            {mentor.review_count > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({mentor.review_count})
              </span>
            )}
          </h2>
          {canRate && !isOwnProfile && !ratingLoading && (
            <Button size="sm" onClick={onShowRatingModal}>
              Add Review
            </Button>
          )}
        </div>
        <ReviewsList mentorId={mentor.id} />
      </motion.section>
    </div>
  );
};

export default MentorProfileSections;
