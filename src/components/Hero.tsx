
import { motion } from "framer-motion";

/**
 * The headline, and nothing else.
 *
 * Everything that used to follow it — the one-line pitch, the CampusMind ask
 * box, the two CTAs and the stats line — now lives in <HomeIntro />, rendered
 * *below* the posts feed. The reasoning is the same one that shrank this
 * section in the first place: a visitor asking "what is this site?" is
 * answered by seeing a real thread, not by reading a claim about one. Every
 * element above the feed is spending pixels the feed needs, so only the
 * headline earns its place, and the explanation waits until after the
 * evidence has already done the convincing.
 */
const Hero = () => (
  <section className="relative pt-8 pb-6 md:pt-10 md:pb-8 overflow-hidden">
    {/* Animated background blobs */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
      <motion.div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full bg-emerald-500/4"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
    </div>

    <div className="container relative z-10">
      <motion.h1
        className="max-w-4xl mx-auto text-center text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-balance"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Your campus,{" "}
        <span className="bg-gradient-to-r from-[#3963C6] via-violet-500 to-emerald-500 bg-clip-text text-transparent">
          one feed.
        </span>
      </motion.h1>
    </div>
  </section>
);

export default Hero;
