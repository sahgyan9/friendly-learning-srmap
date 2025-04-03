
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import CallToAction from "@/components/CallToAction";
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
  
  // Skeleton loader for MentorsSection
  const MentorsSectionSkeleton = () => (
    <div className="py-16 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-4 w-full max-w-2xl mx-auto" />
        </div>
        
        <div className="w-full max-w-3xl mx-auto mb-10">
          <Skeleton className="h-12 w-full rounded-xl mb-2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <Skeleton key={index} className="h-[260px] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
  
  // Skeleton loader for WhyFriendlyLearning
  const WhyFriendlyLearningSkeleton = () => (
    <div className="py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <Skeleton className="h-8 w-80 mx-auto mb-4" />
          <Skeleton className="h-4 w-full max-w-2xl mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="p-6 rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full mb-4" />
              <Skeleton className="h-6 w-48 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
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
  );
};

export default Index;
