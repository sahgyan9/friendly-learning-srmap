
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { MentorCtaTooltip } from "@/components/mentors/MentorCtaTooltip";

const CallToAction = () => {
  const { isMentor } = useAuth();

  return (
    <section className="border-t border-border bg-background py-16 md:py-20">
      <div className="container px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Your profile is someone else&rsquo;s answer
          </h2>
          <p className="mx-auto mb-8 mt-3 max-w-xl text-muted-foreground">
            When the next student searches for a hackathon partner, research collaborator or study
            partner, they should find you. Setting up takes a few minutes and you are listed straight away.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            {!isMentor && (
              <MentorCtaTooltip>
                <Button size="lg" asChild>
                  <Link to="/become-mentor">Set up your mentor profile</Link>
                </Button>
              </MentorCtaTooltip>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link to="/posts">Browse posts</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
