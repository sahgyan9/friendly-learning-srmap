
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import MentorForm from "@/components/MentorForm";

const Hero = () => {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5"></div>
        <div className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-primary/5"></div>
        <div className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full bg-primary/5"></div>
      </div>
      
      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium animate-fade-in">
            SRM AP Mentorship Platform
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance animate-fade-up" style={{animationDelay: "0.1s"}}>
            Connect with Senior Students for Academic Guidance
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance animate-fade-up" style={{animationDelay: "0.2s"}}>
            Friendly Learning connects undergraduate students with experienced
            senior mentors to provide personalized academic support within your university.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up" style={{animationDelay: "0.3s"}}>
            <Link to="/mentors">
              <Button size="lg" className="w-full sm:w-auto">
                Find a Mentor <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <MentorForm />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 px-4 max-w-3xl mx-auto animate-fade-up" style={{animationDelay: "0.4s"}}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">200+</div>
              <p className="text-muted-foreground text-sm">Active Mentors</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">4.8</div>
              <p className="text-muted-foreground text-sm">Average Rating</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">15</div>
              <p className="text-muted-foreground text-sm">Departments</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">1000+</div>
              <p className="text-muted-foreground text-sm">Mentees Helped</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
