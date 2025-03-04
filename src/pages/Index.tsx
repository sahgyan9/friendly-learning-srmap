
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import MentorsSection from "@/components/MentorsSection";
import WhyFriendlyLearning from "@/components/WhyFriendlyLearning";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main>
        <Hero />
        <MentorsSection />
        <WhyFriendlyLearning />
        <CallToAction />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
