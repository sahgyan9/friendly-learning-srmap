
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import CallToAction from "@/components/CallToAction";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load non-critical sections for improved performance
const MentorsSection = lazy(() => import("@/components/MentorsSection"));
const WhyFriendlyLearning = lazy(() => import("@/components/WhyFriendlyLearning"));

const Index = () => {
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.4
      }
    }
  };

  const sectionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.7 }
    }
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Friendly Learning",
    "description": "Student mentorship platform connecting SRM AP university students with experienced peer mentors for academic guidance and career support",
    "url": "https://friendly-learning.lovable.app",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://friendly-learning.lovable.app/mentors?search={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": "SRM University AP",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Amaravati",
        "addressRegion": "Andhra Pradesh",
        "addressCountry": "IN"
      }
    }
  };
  
  // Skeleton loader for MentorsSection with dark mode support
  const MentorsSectionSkeleton = () => (
    <div className="py-16 bg-gray-50 dark:bg-gray-900/60">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4 dark:bg-gray-800" />
          <Skeleton className="h-4 w-full max-w-2xl mx-auto dark:bg-gray-800" />
        </div>
        
        <div className="w-full max-w-3xl mx-auto mb-10">
          <Skeleton className="h-12 w-full rounded-xl mb-2 dark:bg-gray-800" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 dark:bg-gray-800" />
            <Skeleton className="h-6 w-20 dark:bg-gray-800" />
            <Skeleton className="h-6 w-32 dark:bg-gray-800" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <Skeleton key={index} className="h-[260px] rounded-xl dark:bg-gray-800" />
          ))}
        </div>
      </div>
    </div>
  );
  
  // Skeleton loader for WhyFriendlyLearning with dark mode support
  const WhyFriendlyLearningSkeleton = () => (
    <div className="py-16 dark:bg-gray-900/40">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-80 mx-auto mb-4 dark:bg-gray-800" />
          <Skeleton className="h-4 w-full max-w-2xl mx-auto dark:bg-gray-800" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-6 rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full mb-4 dark:bg-gray-800" />
              <Skeleton className="h-6 w-48 mb-3 dark:bg-gray-800" />
              <Skeleton className="h-4 w-full mb-2 dark:bg-gray-800" />
              <Skeleton className="h-4 w-full mb-2 dark:bg-gray-800" />
              <Skeleton className="h-4 w-3/4 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SEOHead
        title="Friendly Learning SRM AP - Premier Student Mentorship Platform | SRMAP Academic Support"
        description="Friendly Learning SRM AP is the leading student mentorship platform at SRM University AP. Connect with experienced peer mentors for academic guidance, career advice, and personalized learning support in Amaravati, Andhra Pradesh. Start your mentorship journey today!"
        keywords="friendly learning srm ap, srmap mentorship platform, srmap friendly learning, SRM AP mentorship, student mentor platform srmap, academic guidance SRM AP, university mentorship program, srm amaravati mentorship, andhra pradesh student mentoring, peer learning srmap, career guidance amaravati"
        canonical="https://friendly-learning.lovable.app"
        structuredData={structuredData}
      />
      
      <motion.div 
        className="min-h-screen"
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <Navbar />
        
        <main>
          <motion.div variants={sectionVariants}>
            <Hero />
          </motion.div>
          
          {/* SEO Content Section */}
          <section className="py-8 bg-background">
            <div className="container px-4 md:px-6">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-3xl font-bold mb-4">
                  <strong>Friendly Learning SRM AP</strong> - Premier <strong>Student Mentorship Platform</strong>
                </h1>
                <h2 className="text-xl font-semibold mb-4">
                  Connect with <strong>Verified Peer Mentors</strong> at <strong>SRM University AP</strong>
                </h2>
                <p className="text-lg mb-6">
                  <strong>SRMAP Friendly Learning</strong> is the leading <strong>mentorship platform</strong> connecting 
                  students with experienced <strong>academic mentors</strong> in <strong>Amaravati, Andhra Pradesh</strong>. 
                  Get personalized <strong>career guidance</strong> and <strong>academic support</strong> from verified 
                  <strong>SRM AP students</strong>.
                </p>
                <h3 className="text-lg font-semibold mb-3">
                  Why Choose <strong>Friendly Learning SRMAP</strong>?
                </h3>
                <ul className="text-left max-w-2xl mx-auto space-y-2">
                  <li>• <strong>Verified student mentors</strong> from SRM University AP</li>
                  <li>• <strong>Personalized academic guidance</strong> across all departments</li>
                  <li>• <strong>Career mentorship</strong> and professional development</li>
                  <li>• <strong>Peer learning community</strong> in Amaravati</li>
                  <li>• <strong>University mentorship program</strong> with proven results</li>
                </ul>
              </div>
            </div>
          </section>
          
          <motion.div 
            variants={sectionVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.1 }}
          >
            <Suspense fallback={<MentorsSectionSkeleton />}>
              <MentorsSection />
            </Suspense>
          </motion.div>
          
          <motion.div 
            variants={sectionVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.1 }}
          >
            <Suspense fallback={<WhyFriendlyLearningSkeleton />}>
              <WhyFriendlyLearning />
            </Suspense>
          </motion.div>
          
          <motion.div 
            variants={sectionVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.1 }}
          >
            <CallToAction />
          </motion.div>
        </main>
        
        <Footer />
      </motion.div>
    </>
  );
};

export default Index;
