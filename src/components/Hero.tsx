
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import BecomeAMentorDialog from "@/components/mentors/BecomeAMentorDialog";

const Hero = () => {
  return (
    <section className="bg-primary/5 py-20 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-10 text-center">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Find Your Perfect <span className="text-primary">Mentor</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
              Connect with senior students who can help you excel in your
              academic journey at SRM AP.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link to="/mentors" className="gap-2">
                <Search className="h-4 w-4" />
                Find a Mentor
              </Link>
            </Button>
            <BecomeAMentorDialog />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
