import { motion } from "framer-motion";
import AskBox from "@/components/search/AskBox";

export const CampusHero = () => {
  return (
    <section className="relative z-30 pt-10 pb-8 md:pt-14 md:pb-10 border-b border-border/60 bg-gradient-to-b from-muted/30 via-background to-background">
      {/* Decorative ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-12 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          {/* Brand Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6 inline-flex items-start justify-center">
            <span>CampusBrain</span>
            <sup className="text-xs sm:text-sm font-semibold text-muted-foreground/80 ml-0.5 mt-0.5 sm:mt-1 select-none">
              TM
            </sup>
          </h1>

          {/* Central Search Box */}
          <div className="max-w-2xl mx-auto">
            <AskBox />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

