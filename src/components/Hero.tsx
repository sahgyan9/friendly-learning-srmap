
import { FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getPlatformStats, type PlatformStats } from "@/integrations/supabase/services/platform-stats";
import AskBox from "@/components/search/AskBox";

const Hero = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => { cancelled = true; };
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.3 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
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

  // The whole hero is sized against one constraint: real post cards must be
  // visible at 1440x900 without scrolling. A visitor asking "what is this site?"
  // is answered by seeing an actual thread, not by reading a claim about one,
  // so every element here is competing with the feed for the same pixels and
  // has to earn them.
  return (
    <section className="relative pt-8 pb-6 md:pt-12 md:pb-8 overflow-hidden">
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
          {/* The "Friendly Learning SRMAP · SRM AP Student Platform" pill that
              was here is gone: it repeated the wordmark sitting directly above
              it in the header, and it cost 54 px of the only screen most
              visitors ever see. */}

          {/* Headline */}
          <motion.h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-balance"
            variants={item}
          >
            Your campus,{" "}
            <span className="bg-gradient-to-r from-[#3963C6] via-violet-500 to-emerald-500 bg-clip-text text-transparent">
              one feed.
            </span>
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto text-balance"
            variants={item}
          >
            Posts, Groups, Mentors, Faculty Ratings — by SRM AP students, for
            SRM AP students.
          </motion.p>

          {/* Above the CTAs, not below them. The pills each send you to one
              section; this answers the question you actually arrived with, and
              a visitor who does not already know which section holds their
              answer is exactly who it is for. */}
          <motion.div className="mb-6" variants={item}>
            <AskBox />
          </motion.div>

          {/* CTA row — two fixed destinations, no carousel.
              The five rotating gradient pills that used to sit here were the
              same five links already in the header nav, re-stated in five
              different colours and moved every 2.5 s. Motion in the one spot a
              visitor is trying to read from is what made the page read as an
              ad rather than as a campus site. Posts is the hook, Groups is the
              second thing we want clicked; the rest stay in the nav. */}
          <motion.div className="mb-6" variants={item}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Brand blue rather than bg-primary: --primary inverts to near-white
                  in dark mode, which both erases white label text and makes the
                  hero CTA look identical to the header's Sign up pill. */}
              <Link
                to="/community-posts"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl
                           text-sm font-semibold text-white bg-[#3963C6] shadow-sm
                           hover:bg-[#31569F] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Browse Posts
              </Link>
              <Link
                to="/communities"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl
                           text-sm font-semibold text-foreground bg-transparent border border-border
                           hover:bg-muted/60 transition-colors"
              >
                <Users className="w-4 h-4" />
                Explore Groups
              </Link>
            </div>

            <motion.p className="mt-3 text-sm text-muted-foreground" variants={item}>
              No sign-up needed to explore. Join when something clicks.
            </motion.p>
          </motion.div>

          {/* Stats, inline rather than as a row of 3xl tiles. Four big numbers
              cost ~120 px of the first screen, and once real post cards clear
              the fold the numbers are no longer the strongest evidence on it —
              the posts are. Each one still links to the page it came from. */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground"
            variants={item}
          >
            {visibleStats.map((stat, i) => (
              <span key={stat.label} className="flex items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="text-muted-foreground/40">
                    ·
                  </span>
                )}
                <Link
                  to={stat.href}
                  className="rounded px-1 py-0.5 transition-colors hover:text-foreground"
                >
                  {stat.value === undefined ? (
                    <span className="inline-block h-4 w-8 animate-pulse rounded bg-muted/50 align-middle" />
                  ) : (
                    <span className={`font-semibold tabular-nums ${stat.color}`}>
                      {stat.value.toLocaleString("en-IN")}
                    </span>
                  )}{" "}
                  {stat.label.toLowerCase()}
                </Link>
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

