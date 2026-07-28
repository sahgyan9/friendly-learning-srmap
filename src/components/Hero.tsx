
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getPlatformStats, type PlatformStats } from "@/integrations/supabase/services/platform-stats";

const Hero = () => {
  const { isMentor } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const statVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        delay: 0.8
      }
    }
  };

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <motion.div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-primary/5"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full bg-primary/5"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="container relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div
            className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium"
            variants={item}
          >
            Friendly Learning SRMAP - SRM AP Student Mentorship Platform
          </motion.div>

          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance"
            variants={item}
          >
            Connect with Student Mentors for Academic Guidance
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance"
            variants={item}
          >
            <strong className="font-bold">Friendly Learning SRMAP</strong> connects undergraduate students with <strong className="font-bold">experienced
              student mentors</strong> to provide <strong className="font-bold">personalized academic support</strong> within your university.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            variants={item}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/mentors">
                  Find a Mentor <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>

            {!isMentor && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/become-mentor">
                    Become a Mentor
                  </Link>
                </Button>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 px-4 max-w-3xl mx-auto"
            variants={item}
          >
            {/* Every figure is counted from the database. Placeholder numbers
                here used to contradict the faculty card further down the page,
                which reported the real department count. */}
            {[
              { value: stats?.faculty, label: "Faculty rated" },
              { value: stats?.departments, label: "Departments" },
              { value: stats?.mentors, label: "Student mentors" },
              { value: stats?.posts, label: "Community posts" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="text-center"
                variants={statVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {stat.value === undefined ? (
                    <span className="inline-block h-8 w-14 animate-pulse rounded bg-primary/10 align-middle" />
                  ) : (
                    stat.value.toLocaleString("en-IN")
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
