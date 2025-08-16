
import Hero from "@/components/Hero";
import MentorsSection from "@/components/MentorsSection";
import WhyFriendlyLearning from "@/components/WhyFriendlyLearning";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import FloatingChatbot from "@/components/chatbot/FloatingChatbot";
import RejectedApplicationNotice from "@/components/mentors/RejectedApplicationNotice";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Friendly Learning - Connect with Student Mentors"
        description="Find and connect with verified student mentors for academic guidance, career advice, and peer support. Join our community of learners helping learners."
      />
      
      <Hero />
      
      {/* Show rejected application notice for authenticated users */}
      {user && (
        <div className="container mx-auto px-4 py-4">
          <RejectedApplicationNotice />
        </div>
      )}
      
      <MentorsSection />
      <WhyFriendlyLearning />
      <CallToAction />
      <Footer />
      <FloatingChatbot />
    </div>
  );
};

export default Index;
