import Hero from "@/components/Hero";
import MentorsSection from "@/components/MentorsSection";
import WhyFriendlyLearning from "@/components/WhyFriendlyLearning";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import { CommunityPostsSection } from "@/components/community/CommunityPostsSection";
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";

const Index = () => {
  return (
    <>
      <SEOHead />
      <Navbar />
      <div className="min-h-screen flex flex-col">
        <Hero />
        <CommunityPostsSection />
        <MentorsSection />
        <WhyFriendlyLearning />
        <CallToAction />
        <Footer />
      </div>
    </>
  );
};

export default Index;
