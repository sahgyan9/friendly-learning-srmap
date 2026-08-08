import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap, UserPlus } from "lucide-react";

import { getMentors } from "@/integrations/supabase/services/mentors";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import { sampleMentors } from "@/data/mentors";
import { MENTOR_BENEFITS } from "@/data/mentor-benefits";
import MentorCard from "@/components/MentorCard";
import MentorCertificate from "@/components/certificate/MentorCertificate";
import { MIN_STUDENTS_FOR_CERTIFICATE, sampleCertificate } from "@/lib/certificate";
import { useAuth } from "@/context/AuthContext";

import MentorsGridSkeleton from "@/components/mentors/loaders/MentorsGridSkeleton";
import EmptyMentorsState from "@/components/mentors/EmptyMentorsState";
import ViewAllLink from "@/components/mentors/ViewAllLink";

/**
 * The mentor accent, filled — the same blue as the Connect button on the
 * chatbot's mentor suggestion card, so "connect with a mentor" looks like one
 * colour wherever it appears. Held constant across light and dark rather than
 * using the `primary` token, which flips to near-white in dark mode and would
 * turn the section's lead action into a colourless slab.
 */
const MENTOR_BUTTON =
  "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white shadow-sm";

/**
 * Homepage Mentors section.
 *
 * Shaped to match the Groups section directly above it: a pill heading, one
 * line of copy, then buttons that *are* the explanation — you read the section
 * by reading what you can press.
 *
 * The search bar that used to sit here is gone on purpose. Search is one field
 * in the navbar covering pages, mentors, lecturers and posts; a second, weaker
 * box that only searched mentors was teaching people the wrong entry point and
 * pushing the actual mentor cards below the fold.
 */
const MentorsSection = () => {
  const { user, profile, isMentor } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBenefits, setShowBenefits] = useState(false);

  useEffect(() => {
    const fetchMentors = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getMentors();

        if (error) {
          console.error("Error fetching mentors:", error);
          toast.error("Error", {
            description: "Failed to load mentors. Using sample data instead.",
          });
          setMentors(sampleMentors.slice(0, 8));
          return;
        }

        if (data && data.length > 0) {
          // Only display a limited number initially for faster rendering
          setMentors(data.slice(0, 8));
        } else {
          setMentors(sampleMentors.slice(0, 8));
          toast("Using sample data", {
            description: "No mentors found in database. Using sample data instead.",
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        setMentors(sampleMentors.slice(0, 8));
        toast.error("Error", {
          description: "An unexpected error occurred. Using sample data instead.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, []);

  /**
   * "Set up your profile" only earns a slot when there is something left to set
   * up. Bio, department and skills are the three fields a mentor is actually
   * found by — a profile missing any of them is invisible in practice, so those
   * are what "set up" means here. Signed-out visitors get no such button: their
   * next step is the sign-up the first button already leads to.
   */
  const profileNeedsSetup =
    Boolean(user) &&
    Boolean(profile) &&
    (!profile?.bio?.trim() ||
      !profile?.department?.trim() ||
      !(profile?.skills && profile.skills.length > 0));

  return (
    <section className="py-16 bg-secondary/50 dark:bg-gray-900/30">
      <div className="container px-4 md:px-6">
        {/* Section header — pill pattern shared with Groups. Mentors carry the
            connect blue, written literally rather than as `primary` because the
            `primary` token inverts to near-white in dark mode, which would
            leave this section's accent colourless exactly where Groups keeps
            its amber. */}
        <div className="max-w-2xl mx-auto text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full border border-blue-600/25 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-widest uppercase"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Mentors
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-muted-foreground text-base"
          >
            Someone here has already done your exact course — and you've already
            done someone else's. Take a seat on either side.
          </motion.p>
        </div>

        {/* CTAs lead the section, same as Groups: what you can do is stated
            before the examples rather than after them. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          {isMentor && user ? (
            <Button asChild size="lg" className={MENTOR_BUTTON}>
              <Link to={`/mentor/${user.id}`}>
                <GraduationCap className="mr-2 h-4 w-4" />
                View your mentor profile
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className={MENTOR_BUTTON}>
              <Link to={user ? "/become-mentor" : "/signup"}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add yourself as a mentor
              </Link>
            </Button>
          )}

          {profileNeedsSetup && (
            <Button asChild size="lg" variant="outline">
              <Link to="/profile">Set up your profile</Link>
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowBenefits((open) => !open)}
            aria-expanded={showBenefits}
            aria-controls="mentor-benefits"
            className="gap-2"
          >
            See mentor benefits
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                showBenefits ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        {/* Benefits expand in place. Sending people to another page to read why
            they'd bother is how you lose them before the mentor cards below
            ever get seen. */}
        <AnimatePresence initial={false}>
          {showBenefits && (
            <motion.div
              id="mentor-benefits"
              key="mentor-benefits"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="max-w-4xl mx-auto grid gap-4 pt-6 pb-2">
                {MENTOR_BENEFITS.map(
                  ({ icon: Icon, title, body, accent, featured }, i) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.06 + i * 0.05 }}
                      className={`flex gap-4 rounded-xl border bg-gradient-to-br p-5 ${accent.card} ${
                        featured ? "sm:p-6" : ""
                      }`}
                    >
                      <span
                        className={`flex shrink-0 items-center justify-center rounded-lg ${accent.chip} ${
                          featured ? "h-12 w-12" : "h-9 w-9"
                        }`}
                      >
                        <Icon className={featured ? "h-6 w-6" : "h-4 w-4"} />
                      </span>
                      <div className="space-y-1">
                        <h3
                          className={`font-semibold leading-snug ${accent.title} ${
                            featured ? "text-lg" : ""
                          }`}
                        >
                          {title}
                        </h3>
                        <p
                          className={`leading-relaxed text-muted-foreground ${
                            featured ? "text-sm sm:text-base" : "text-sm"
                          }`}
                        >
                          {body}
                        </p>
                      </div>
                    </motion.div>
                  ),
                )}

                {/* The certificate itself, not a description of it. Talking
                    about a credential is far weaker than showing one, and this
                    is the thing people stay for.

                    It must stay a SAMPLE. `sampleCertificate` sets
                    `sample: true`, which draws the watermark, and the bar is
                    stated directly underneath — an unmarked certificate shown
                    to someone who has helped nobody would be a promise the
                    platform has not kept. */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.06 + MENTOR_BENEFITS.length * 0.05 }}
                  className="mt-2"
                >
                  <div className="overflow-hidden rounded-xl border shadow-sm">
                    <MentorCertificate data={sampleCertificate("")} />
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    A sample with made-up figures. The real one is issued once you've had a
                    genuine back-and-forth with {MIN_STUDENTS_FOR_CERTIFICATE} students — they
                    have to reply, so it can't be earned by messaging people who never answer.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-10">
          {isLoading ? (
            <MentorsGridSkeleton />
          ) : mentors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          ) : (
            <EmptyMentorsState />
          )}
        </div>

        {/* View all mentors link */}
        {mentors.length > 0 && <ViewAllLink url="/mentors" />}
      </div>
    </section>
  );
};

export default MentorsSection;
