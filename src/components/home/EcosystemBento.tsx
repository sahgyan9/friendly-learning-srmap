import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FacultyIcon } from "@/components/icons/FacultyIcon";
import { GroupsIcon } from "@/components/icons/GroupsIcon";
import { MentorIcon } from "@/components/icons/MentorIcon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const EcosystemBento = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/20 border-t border-border/60">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
            Everything you need for your SRM-AP journey
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Built by students who understand what it takes to find mentors, form teams, and excel on campus.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Peer Mentorship */}
          <Card className="p-6 flex flex-col justify-between border-border/80 hover:border-blue-500/40 hover:shadow-md transition-all group bg-card">
            <div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MentorIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Senior Mentorship
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4">
                Connect with seniors who already took your exact courses and excelled. Get 1-on-1 guidance, project advice, and verified peer support.
              </p>
            </div>
            <Button asChild variant="ghost" className="justify-start px-0 text-blue-600 hover:text-blue-700 hover:bg-transparent text-xs">
              <Link to="/mentors" className="inline-flex items-center gap-1.5 font-semibold">
                Explore Student Mentors
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </Card>

          {/* Card 2: Faculty Directory & Reviews */}
          <Card className="p-6 flex flex-col justify-between border-border/80 hover:border-rose-500/40 hover:shadow-md transition-all group bg-card">
            <div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FacultyIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Faculty Explorer & Ratings
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4">
                Find the right professor for your research or elective with domain tags, research interests, and anonymous student reviews.
              </p>
            </div>
            <Button asChild variant="ghost" className="justify-start px-0 text-rose-600 hover:text-rose-700 hover:bg-transparent text-xs">
              <Link to="/faculty" className="inline-flex items-center gap-1.5 font-semibold">
                Search Faculty Directory
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </Card>

          {/* Card 3: Groups & Hackathons */}
          <Card className="p-6 flex flex-col justify-between border-border/80 hover:border-emerald-500/40 hover:shadow-md transition-all group bg-card">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GroupsIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Teams & Campus Groups
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-4">
                Recruit teammates for hackathons, create private study workspaces, or join public interest clubs with other active SRM AP students.
              </p>
            </div>
            <Button asChild variant="ghost" className="justify-start px-0 text-emerald-600 hover:text-emerald-700 hover:bg-transparent text-xs">
              <Link to="/workspace-groups" className="inline-flex items-center gap-1.5 font-semibold">
                Join or Create a Group
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};
