import { FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getPlatformStats, type PlatformStats } from "@/integrations/supabase/services/platform-stats";
import AskBox from "@/components/search/AskBox";

/**
 * The "what is this place?" block — everything that used to sit in the hero
 * between the headline and the fold.
 *
 * It reads better here than it did up top. Above the feed it was six claims
 * with no evidence behind them, and a visitor had to take the pitch on faith
 * before seeing a single real post. Below the feed the order is reversed:
 * they have already scrolled past actual threads, so the pitch is confirming
 * something they just saw rather than asking to be believed. The two CTAs in
 * particular only make sense here — a "Browse Posts" button sitting directly
 * above the posts was telling people to go do the thing they were already
 * doing.
 */
export const HomeIntro = () => {
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
    show: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  /**
   * A headline number is only worth showing once it reads as momentum. "5
   * student mentors" and "3 community posts" argue against a promise of a busy
   * feed, so each of those has a floor it must clear before it appears at all.
   * Faculty and Groups have no floor — faculty is the strong number already,
   * and Groups is the thing we most want a visitor to click into.
   *
   * Every number links to the page it came from; a stat that can't be acted on
   * is just decoration.
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
      label: "Workspace Groups",
      href: "/workspace-groups",
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
      label: "Posts",
      href: "/posts",
      color: "text-emerald-500",
      floor: 5,
    },
  ];

  // Before the counts land, show only the two floorless entries as skeletons.
  // Rendering all four and then dropping two would shift the page under the
  // reader's eye the moment the query resolves.
  const visibleStats = allStats.filter((s) =>
    stats === null ? s.floor === 0 : (s.value ?? 0) > s.floor,
  );

  return (
    <section className="relative overflow-hidden py-12 md:py-16">
      {/* The drifting blobs came down from the old hero along with everything
          else in this block — they were only ever decoration for it. */}
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
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* Still the page's h1, just no longer the page's first pixel. It
              reads as a summary of what was scrolled past rather than a claim
              made before any evidence — and the document still has exactly one
              h1 where a crawler expects it. */}
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

          {/* The ask box answers the question you actually arrived with, which
              is why it sits above the CTAs rather than below them: each CTA
              sends you to one section, and a visitor who does not already know
              which section holds their answer is exactly who this is for. */}
          <motion.div className="mb-6" variants={item}>
            <AskBox />
          </motion.div>

          {/* Two fixed destinations, no carousel. The five rotating gradient
              pills that used to be here were the same five links already in the
              header nav, restated in five colours and moved every 2.5 s.
              Motion in the one spot a visitor is trying to read from is what
              made the page read as an ad rather than as a campus site. */}
          <motion.div className="mb-6" variants={item}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Brand blue rather than bg-primary: --primary inverts to
                  near-white in dark mode, which both erases white label text
                  and makes this look identical to the header's Sign up pill. */}
              <Link
                to="/posts"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl
                           text-sm font-semibold text-white bg-[#3963C6] shadow-sm
                           hover:bg-[#31569F] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Browse Posts
              </Link>
              <Link
                to="/workspace-groups"
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

          {/* Stats inline rather than as a row of 3xl tiles: the posts above
              are the real evidence now, so the numbers support them instead of
              standing in for them. */}
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

export default HomeIntro;
