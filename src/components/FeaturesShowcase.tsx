import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import {
  GraduationCap,
  CalendarDays,
  Users,
  FileText,
  BookOpen,
  ArrowRight,
  Sparkles,
  BadgeCheck,
} from "lucide-react";

interface Feature {
  id: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  label: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  badge?: string;
}

const features: Feature[] = [
  {
    id: "mentor",
    icon: <GraduationCap className="w-7 h-7" />,
    accent: "text-[#3963C6]",
    accentBg: "bg-[#3963C6]/10 dark:bg-[#3963C6]/20",
    label: "01 — Mentors",
    title: "Peer Mentorship",
    description:
      "Find a verified senior who has already cracked your course. Get guidance that textbooks can't give.",
    cta: "Browse mentors",
    href: "/mentors",
    badge: "Live",
  },
  {
    id: "events",
    icon: <CalendarDays className="w-7 h-7" />,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/20",
    label: "02 — Events",
    title: "Campus Events",
    description:
      "Workshops, hackathons, career fairs — all in one place. Never miss what's happening on campus again.",
    cta: "Explore events",
    href: "/marketplace",
    badge: "Live",
  },
  {
    id: "faculty",
    icon: <BookOpen className="w-7 h-7" />,
    accent: "text-rose-600 dark:text-rose-400",
    accentBg: "bg-rose-500/10 dark:bg-rose-500/20",
    label: "03 — Faculty",
    title: "Faculty Discovery",
    description:
      "Browse every professor's profile, read honest student ratings, and choose your courses with full information before you enrol.",
    cta: "Rate faculty",
    href: "/faculty",
    badge: "Live",
  },
  {
    id: "groups",
    icon: <Users className="w-7 h-7" />,
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/20",
    label: "04 — Groups",
    title: "Study Communities",
    description:
      "Create or join subject-specific groups. Collaborate on assignments, find study partners for exams, and build your academic circle.",
    cta: "Join a group",
    href: "/communities",
    badge: "Live",
  },
  {
    id: "posts",
    icon: <FileText className="w-7 h-7" />,
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    label: "05 — Posts",
    title: "Community Posts",
    description:
      "Share knowledge, ask questions, post resources. A student-run knowledge feed built for SRM AP — not the whole internet.",
    cta: "See posts",
    href: "/community-posts",
    badge: "Live",
  },
  {
    id: "certificates",
    icon: <BadgeCheck className="w-7 h-7" />,
    accent: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-500/10 dark:bg-teal-500/20",
    label: "06 — Certificates",
    title: "Verified Certificates",
    description:
      "Earn a shareable, publicly verifiable certificate once you've completed real mentorship exchanges — proof that lives beyond your CV.",
    cta: "Earn yours",
    href: "/certificate",
    badge: "Live",
  },
];

/**
 * Each card owns a slice of the grid's scroll progress, so cards reveal one at
 * a time as you scroll rather than a whole row arriving at once. The slices
 * overlap slightly (window is wider than the step) to keep the sequence from
 * feeling like six separate pops.
 */
const REVEAL_START = 0.06;
const REVEAL_STEP = 0.12;
const REVEAL_WINDOW = 0.16;

function FeatureCard({
  feat,
  index,
  progress,
  reduced,
}: {
  feat: Feature;
  index: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const start = REVEAL_START + index * REVEAL_STEP;
  const range: [number, number] = [start, start + REVEAL_WINDOW];

  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [48, 0]);
  const scale = useTransform(progress, range, [0.96, 1]);

  return (
    <motion.div style={reduced ? undefined : { opacity, y, scale }}>
      <Link
        to={feat.href}
        className="group relative flex flex-col h-full p-7 rounded-2xl border border-border bg-card shadow-sm
                   hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden"
      >
        {/* Hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-primary/3 to-transparent" />

        {/* Badge */}
        {feat.badge && (
          <span className="absolute top-5 right-5 text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {feat.badge}
          </span>
        )}

        {/* Icon */}
        <div
          className={`mb-5 flex items-center justify-center rounded-xl ${feat.accentBg} ${feat.accent} transition-transform duration-300 group-hover:scale-110`}
          style={{ width: "52px", height: "52px" }}
        >
          {feat.icon}
        </div>

        {/* Label */}
        <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
          {feat.label}
        </p>

        {/* Title */}
        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors duration-200">
          {feat.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed flex-1">
          {feat.description}
        </p>

        {/* CTA */}
        <div
          className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${feat.accent} group-hover:gap-2.5 transition-all duration-200`}
        >
          {feat.cta}
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}

export function FeaturesShowcase() {
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  // 0 when the grid's top reaches the bottom of the viewport, 1 when its
  // bottom reaches the middle — the span over which the six cards arrive.
  const { scrollYProgress } = useScroll({
    target: gridRef,
    offset: ["start end", "end center"],
  });

  return (
    <section
      id="features"
      className="py-20 md:py-28 bg-background dark:bg-gray-950/60"
    >
      <div className="container px-4 md:px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            What's inside
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            Everything a student needs,{" "}
            <span className="text-primary">in one place</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            Six features already live at SRM AP — each solving a real problem
            students face every semester.
          </motion.p>
        </div>

        {/* Feature Cards Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat, i) => (
            <FeatureCard
              key={feat.id}
              feat={feat}
              index={i}
              progress={scrollYProgress}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
