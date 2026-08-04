
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { UsersRound, Calendar, Star, BadgeCheck } from "lucide-react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  className?: string;
}

const FeatureCard = ({ icon, title, description, href, className }: FeatureCardProps) => {
  // Parse description for keywords that should be bolded
  const boldedDescription = () => {
    if (title === "Direct Messaging") {
      return (
        <>
          Connect with mentors through our <strong className="font-bold">real-time messaging</strong> system for quick help.
        </>
      );
    }
    else if (title === "Verified Mentors") {
      return (
        <>
          All our mentors are <strong className="font-bold">verified students</strong> from your university with proven expertise.
        </>
      );
    }
    else if (title === "Smart Matching") {
      return (
        <>
          Our <strong className="font-bold">intelligent search</strong> helps you find mentors with the exact skills you need.
        </>
      );
    }
    else if (title === "Study Groups") {
      return (
        <>
          Join <strong className="font-bold">subject and interest groups</strong> to learn and collaborate with peers across SRM AP.
        </>
      );
    }
    else if (title === "Campus Events") {
      return (
        <>
          Stay on top of <strong className="font-bold">workshops, hackathons, and meetups</strong> happening around campus.
        </>
      );
    }
    else if (title === "Faculty Ratings") {
      return (
        <>
          Browse faculty profiles and share <strong className="font-bold">honest ratings and reviews</strong> before you enroll.
        </>
      );
    }
    else if (title === "Verified Certificates") {
      return (
        <>
          Earn a <strong className="font-bold">shareable, verifiable certificate</strong> once you've completed real mentorship exchanges.
        </>
      );
    }
    return description;
  };

  return (
    <Link
      to={href}
      className={`block p-6 rounded-xl bg-card shadow-sm border border-border text-center transition-colors hover:border-primary/40 hover:shadow-md ${className ?? ""}`}
    >
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{boldedDescription()}</p>
    </Link>
  );
};

const WhyFriendlyLearning = () => {
  return (
    <section className="py-16 bg-background dark:bg-gray-900/40">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Friendly Learning SRMAP?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We make it easy to connect with the <strong className="font-bold">right mentor</strong> for your needs at <strong className="font-bold">SRM AP</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            }
            title="Direct Messaging"
            description="Connect with mentors through our real-time messaging system for quick help."
            href="/messages"
          />

          <FeatureCard
            icon={
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title="Verified Mentors"
            description="All our mentors are verified students from your university with proven expertise."
            href="/mentors"
          />

          <FeatureCard
            icon={
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            title="Smart Matching"
            description="Our intelligent search helps you find mentors with the exact skills you need."
            href="/mentors"
          />

          <FeatureCard
            icon={<UsersRound className="w-6 h-6 text-primary" strokeWidth={2} />}
            title="Study Groups"
            description="Join subject and interest groups to learn and collaborate with peers across SRM AP."
            href="/communities"
          />

          <FeatureCard
            icon={<Calendar className="w-6 h-6 text-primary" strokeWidth={2} />}
            title="Campus Events"
            description="Stay on top of workshops, hackathons, and meetups happening around campus."
            href="/marketplace"
          />

          <FeatureCard
            icon={<Star className="w-6 h-6 text-primary" strokeWidth={2} />}
            title="Faculty Ratings"
            description="Browse faculty profiles and share honest ratings and reviews before you enroll."
            href="/faculty"
          />

          <FeatureCard
            icon={<BadgeCheck className="w-6 h-6 text-primary" strokeWidth={2} />}
            title="Verified Certificates"
            description="Earn a shareable, verifiable certificate once you've completed real mentorship exchanges."
            href="/certificate"
            className="sm:col-span-2 lg:col-span-1 lg:col-start-2"
          />
        </div>
      </div>
    </section>
  );
};

export default WhyFriendlyLearning;
