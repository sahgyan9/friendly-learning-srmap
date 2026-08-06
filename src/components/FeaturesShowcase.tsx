import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap,
  CalendarDays,
  Users,
  FileText,
  BookOpen,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Lightbulb,
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
    id: "messaging",
    icon: <MessageSquare className="w-7 h-7" />,
    accent: "text-sky-600 dark:text-sky-400",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/20",
    label: "02 — Messaging",
    title: "Direct Messaging",
    description:
      "Talk to mentors and collaborators in real time. No email chains, no waiting — just quick help when you need it.",
    cta: "Open messages",
    href: "/messages",
    badge: "Live",
  },
  {
    id: "events",
    icon: <CalendarDays className="w-7 h-7" />,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/20",
    label: "03 — Events",
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
    label: "04 — Faculty",
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
    label: "05 — Groups",
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
    label: "06 — Posts",
    title: "Community Posts",
    description:
      "Share knowledge, ask questions, post resources. A student-run knowledge feed built for SRM AP — not the whole internet.",
    cta: "See posts",
    href: "/community-posts",
    badge: "Live",
  },
  {
    id: "matching",
    icon: <Lightbulb className="w-7 h-7" />,
    accent: "text-orange-600 dark:text-orange-400",
    accentBg: "bg-orange-500/10 dark:bg-orange-500/20",
    label: "07 — Matching",
    title: "Smart Matching",
    description:
      "Intelligent search finds mentors with the exact skills you need — not just anyone who signed up, but the right fit for your goal.",
    cta: "Find your match",
    href: "/mentors",
    badge: "Live",
  },
  {
    id: "certificates",
    icon: <BadgeCheck className="w-7 h-7" />,
    accent: "text-teal-600 dark:text-teal-400",
    accentBg: "bg-teal-500/10 dark:bg-teal-500/20",
    label: "08 — Certificates",
    title: "Verified Certificates",
    description:
      "Earn a shareable, publicly verifiable certificate once you've completed real mentorship exchanges — proof that lives beyond your CV.",
    cta: "Earn yours",
    href: "/certificate",
    badge: "Live",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function FeaturesShowcase() {
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
            Five features already live at SRM AP — each solving a real problem
            students face every semester.
          </motion.p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className=""
            >
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
                  className={`w-13 h-13 mb-5 flex items-center justify-center rounded-xl ${feat.accentBg} ${feat.accent} transition-transform duration-300 group-hover:scale-110`}
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
          ))}
        </div>
      </div>
    </section>
  );
}
