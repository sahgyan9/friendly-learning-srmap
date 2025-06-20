
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import CallToAction from "@/components/CallToAction";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy load non-critical sections for improved performance
const MentorsSection = lazy(() => import("@/components/MentorsSection"));
const WhyFriendlyLearning = lazy(() => import("@/components/WhyFriendlyLearning"));

const Index = () => {
  const isMobile = useIsMobile();

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
    <div className="py-8 md:py-16 bg-gray-50 dark:bg-gray-900/60">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <Skeleton className="h-6 md:h-8 w-48 md:w-64 mx-auto mb-4 dark:bg-gray-800" />
          <Skeleton className="h-4 w-full max-w-2xl mx-auto dark:bg-gray-800" />
        </div>
        
        <div className="w-full max-w-3xl mx-auto mb-6 md:mb-10">
          <Skeleton className="h-10 md:h-12 w-full rounded-xl mb-2 dark:bg-gray-800" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 dark:bg-gray-800" />
            <Skeleton className="h-6 w-20 dark:bg-gray-800" />
            <Skeleton className="h-6 w-32 dark:bg-gray-800" />
          </div>
        </div>
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6'}`}>
          {[...Array(isMobile ? 4 : 8)].map((_, index) => (
            <Skeleton key={index} className="h-[200px] md:h-[260px] rounded-xl dark:bg-gray-800" />
          ))}
        </div>
      </div>
    </div>
  );
  
  // Skeleton loader for WhyFriendlyLearning with dark mode support
  const WhyFriendlyLearningSkeleton = () => (
    <div className="py-8 md:py-16 dark:bg-gray-900/40">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <Skeleton className="h-6 md:h-8 w-64 md:w-80 mx-auto mb-4 dark:bg-gray-800" />
          <Skeleton className="h-4 w-full max-w-2xl mx-auto dark:bg-gray-800" />
        </div>
        
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-3 gap-8'}`}>
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-4 md:p-6 rounded-lg">
              <Skeleton className="h-10 md:h-12 w-10 md:w-12 rounded-full mb-4 dark:bg-gray-800" />
              <Skeleton className="h-5 md:h-6 w-40 md:w-48 mb-3 dark:bg-gray-800" />
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
        title="Friendly Learning SRM AP - Student Mentorship Platform | Connect with Academic Mentors"
        description="Join Friendly Learning SRM AP's premier student mentorship platform. Connect with experienced peer mentors for academic guidance, career advice, and personalized learning support. Start your mentorship journey today!"
        keywords="friendly learning srm ap, SRM AP mentorship, student mentor platform, academic guidance SRM, university mentorship program, student to student mentoring, SRM AP academic support, peer learning, career guidance"
        canonical="https://friendly-learning.lovable.app"
        structuredData={structuredData}
      />
      
      <motion.div 
        className="min-h-screen"
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <main>
          <motion.div variants={sectionVariants}>
            <Hero />
          </motion.div>
          
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
