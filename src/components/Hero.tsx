
import { CalendarDays, FileText, GraduationCap, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { getPlatformStats, type PlatformStats } from "@/integrations/supabase/services/platform-stats";
import AskBox from "@/components/search/AskBox";

/** Rotating CTAs — each has its own colour identity matching the brand accent map */
const CYCLING_CTАС = [
  {
    label: "Explore Posts",
    href: "/community-posts",
    icon: <FileText className="w-4 h-4" />,
    gradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-500/30",
    ring: "ring-emerald-500/40",
  },
  {
    label: "Explore Groups",
    href: "/communities",
    icon: <Users className="w-4 h-4" />,
    gradient: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/30",
    ring: "ring-amber-500/40",
  },
  {
    label: "University Events",
    href: "/marketplace",
    icon: <CalendarDays className="w-4 h-4" />,
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/30",
    ring: "ring-violet-500/40",
  },
  {
    label: "Rate Faculty",
    href: "/faculty",
    icon: <Star className="w-4 h-4" />,
    gradient: "from-rose-500 to-pink-500",
    shadow: "shadow-rose-500/30",
    ring: "ring-rose-500/40",
  },
  {
    label: "Find a Mentor",
    href: "/mentors",
    icon: <GraduationCap className="w-4 h-4" />,
    gradient: "from-[#3963C6] to-indigo-500",
    shadow: "shadow-blue-500/30",
    ring: "ring-blue-500/40",
  },
] as const;

/** Visual styling only — position/enter/exit animation is handled by the caller's shared layout. */
const CtaPill = ({ cta }: { cta: (typeof CYCLING_CTАС)[number] }) => (
  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
    <Link
      to={cta.href}
      className={`relative group inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white
                 shadow ${cta.shadow} hover:shadow-lg hover:brightness-110
                 transition-all duration-300 whitespace-nowrap overflow-hidden`}
    >
      <span
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-r ${cta.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
      />
      <span className="relative z-10 flex items-center gap-2 text-white">
        {cta.icon}
        {cta.label}
      </span>
    </Link>
  </motion.div>
);

const Hero = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [ctaIndex, setCtaIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => { cancelled = true; };
  }, []);

  // Both CTA slots advance together every 2.5 s, paused while the row is hovered
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setCtaIndex((i) => (i + 1) % CYCLING_CTАС.length);
    }, 2500);
    return () => clearInterval(id);
  }, [isPaused]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };
  const statVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, delay: 0.8 } },
  };

  /**
   * A headline number is only worth showing once it reads as momentum. "5
   * student mentors" and "3 community posts" sitting in 3xl bold under a
   * promise of a busy feed argue against the promise, so each of those tiles
   * has a floor it has to clear before it appears at all. Faculty and Groups
   * have no floor — faculty is the strong number already, and Groups is the
   * thing we most want a visitor to click into.
   *
   * Every tile links to the page its number came from; a stat that can't be
   * acted on is just decoration.
   */
  const allStats = [
    {
      value: stats?.faculty,
      label: "Faculty rated",
      href: "/faculty",
      color: "text-rose-500",
      floor: 0,
    },
    {
      value: stats?.groups,
      label: "Groups",
      href: "/communities",
      color: "text-amber-500",
      floor: 0,
    },
    {
      value: stats?.mentors,
      label: "Student mentors",
      href: "/mentors",
      color: "text-[#3963C6]",
      floor: 10,
    },
    {
      value: stats?.posts,
      label: "Community posts",
      href: "/community-posts",
      color: "text-emerald-500",
      floor: 5,
    },
  ];

  // Before the counts land, show only the two floorless tiles as skeletons.
  // Rendering all four and then dropping two would shift the page under the
  // reader's eye the moment the query resolves.
  const visibleStats = allStats.filter((s) =>
    stats === null ? s.floor === 0 : (s.value ?? 0) > s.floor,
  );

  // Padding is deliberately tight at the bottom: the Posts section is the hook,
  // and letting its first cards break the fold is the strongest cue there is
  // that the page continues.
  return (
    <section className="relative pt-16 pb-10 md:pt-20 md:pb-12 overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/3 -left-24 w-80 h-80 rounded-full bg-violet-500/4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 right-1/3 w-72 h-72 rounded-full bg-emerald-500/4"
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
          {/* Platform pill */}
          <motion.div
            className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium"
            variants={item}
          >
            Friendly Learning SRMAP · SRM AP Student Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance"
            variants={item}
          >
            Your campus,{" "}
            <span className="bg-gradient-to-r from-[#3963C6] via-violet-500 to-emerald-500 bg-clip-text text-transparent">
              one feed.
            </span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-7 max-w-2xl mx-auto text-balance"
            variants={item}
          >
            Posts, Groups, Mentors, Faculty Ratings — all from SRM AP students,
            for SRM AP students. Built by people who sat in the same classrooms.
          </motion.p>

          {/* Above the CTAs, not below them. The pills each send you to one
              section; this answers the question you actually arrived with, and
              a visitor who does not already know which section holds their
              answer is exactly who it is for. */}
          <motion.div className="mb-9" variants={item}>
            <AskBox />
          </motion.div>

          {/* CTA row */}
          <motion.div className="mb-12" variants={item}>
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* The item in slot 2 keeps its layoutId as it becomes slot 1, so it visibly slides over instead of cross-fading in place. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {[CYCLING_CTАС[ctaIndex], CYCLING_CTАС[(ctaIndex + 1) % CYCLING_CTАС.length]].map((cta) => (
                  <motion.div
                    key={cta.label}
                    layout
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <CtaPill cta={cta} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Cycling indicator dots */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {CYCLING_CTАС.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCtaIndex(i)}
                  aria-label={`Show ${CYCLING_CTАС[i].label}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === ctaIndex
                      ? "w-5 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>

            <motion.p className="mt-3 text-sm text-muted-foreground" variants={item}>
              No sign-up needed to explore. Join when something clicks.
            </motion.p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex flex-wrap items-start justify-center gap-x-12 gap-y-8 px-4 max-w-3xl mx-auto"
            variants={item}
          >
            {visibleStats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={statVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Link
                  to={stat.href}
                  className="block text-center rounded-lg px-3 py-1 transition-colors hover:bg-muted/40"
                >
                  <div className={`text-3xl font-bold tabular-nums ${stat.color}`}>
                    {stat.value === undefined ? (
                      <span className="inline-block h-8 w-14 animate-pulse rounded bg-muted/50 align-middle" />
                    ) : (
                      stat.value.toLocaleString("en-IN")
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

