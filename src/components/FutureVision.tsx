import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Search,
  Handshake,
  Rocket,
  Trophy,
  Brain,
  ArrowRight,
  CheckCircle2,
  Cpu,
} from "lucide-react";

interface Phase {
  id: string;
  step: string;
  icon: React.ReactNode;
  color: string;
  colorBg: string;
  colorBorder: string;
  title: string;
  subtitle: string;
  items: string[];
  status: "live" | "building" | "planned";
}

const phases: Phase[] = [
  {
    id: "discover",
    step: "Phase 1",
    icon: <Search className="w-5 h-5" />,
    color: "text-brand",
    colorBg: "bg-brand/10",
    colorBorder: "border-brand/30",
    title: "Discover",
    subtitle: "Find your path",
    items: [
      "Browse & rate faculty before enrolling",
      "Explore peer mentors by subject & year",
      "Discover campus events & hackathons",
      "Read community posts & knowledge feeds",
    ],
    status: "live",
  },
  {
    id: "connect",
    step: "Phase 2",
    icon: <Handshake className="w-5 h-5" />,
    color: "text-violet-600 dark:text-violet-400",
    colorBg: "bg-violet-500/10",
    colorBorder: "border-violet-500/30",
    title: "Connect",
    subtitle: "Find your people",
    items: [
      "Find study partners for exams",
      "Build hackathon teams",
      "Join subject-specific communities",
      "Message mentors & collaborators directly",
    ],
    status: "live",
  },
  {
    id: "build",
    step: "Phase 3",
    icon: <Rocket className="w-5 h-5" />,
    color: "text-amber-600 dark:text-amber-400",
    colorBg: "bg-amber-500/10",
    colorBorder: "border-amber-500/30",
    title: "Build",
    subtitle: "Do real work",
    items: [
      "Post & collaborate on projects",
      "Find research opportunities with faculty",
      "Form groups that ship real deliverables",
      "Track progress and earn verified certificates",
    ],
    status: "building",
  },
  {
    id: "succeed",
    step: "Phase 4",
    icon: <Trophy className="w-5 h-5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    colorBg: "bg-emerald-500/10",
    colorBorder: "border-emerald-500/30",
    title: "Succeed",
    subtitle: "Leave a legacy",
    items: [
      "Graduate with a portfolio of real work",
      "Become a mentor for the next batch",
      "Alumni network: jobs, referrals, guidance",
      "Your profile stays — your impact compounds",
    ],
    status: "planned",
  },
];

const statusLabel: Record<Phase["status"], { text: string; cls: string }> = {
  live: {
    text: "Live now",
    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  building: {
    text: "Building",
    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  planned: {
    text: "Planned",
    cls: "bg-primary/10 text-primary border-primary/20",
  },
};

const cardAnim = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const sl = statusLabel[phase.status];

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={cardAnim}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className="relative flex flex-col"
    >
      {/* Connector line between cards (hidden on last) */}
      {index < phases.length - 1 && (
        <div
          className="hidden lg:block absolute top-10 left-full w-full h-px z-0"
          style={{ width: "calc(100% - 3rem)" }}
        >
          <div className="w-full h-px border-t-2 border-dashed border-border" />
          <ArrowRight className="absolute -right-3 -top-3 w-5 h-5 text-border" />
        </div>
      )}

      <div
        className={`relative z-10 flex flex-col h-full p-7 rounded-2xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg ${phase.colorBorder}`}
      >
        {/* Step + status */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            {phase.step}
          </span>
          <span
            className={`text-3xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${sl.cls}`}
          >
            {sl.text}
          </span>
        </div>

        {/* Icon */}
        <div
          className={`w-12 h-12 flex items-center justify-center rounded-xl mb-5 ${phase.colorBg} ${phase.color}`}
        >
          {phase.icon}
        </div>

        {/* Title */}
        <h3 className={`text-2xl font-extrabold mb-1 ${phase.color}`}>
          {phase.title}
        </h3>
        <p className="text-sm text-muted-foreground font-medium mb-5">
          {phase.subtitle}
        </p>

        {/* Items */}
        <ul className="space-y-2.5 flex-1">
          {phase.items.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2
                className={`w-4 h-4 mt-0.5 shrink-0 ${phase.color}`}
              />
              <span className="text-sm text-muted-foreground leading-snug">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function FutureVision() {
  const aiRef = useRef<HTMLDivElement>(null);
  const aiInView = useInView(aiRef, { once: true, margin: "-80px" });

  return (
    <section
      id="future-vision"
      className="py-20 md:py-28 bg-secondary/40 dark:bg-gray-900/60 overflow-hidden"
    >
      <div className="container px-4 md:px-6">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold tracking-wide uppercase"
          >
            <Brain className="w-3.5 h-3.5" />
            The big picture
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            A complete ecosystem for{" "}
            <span className="text-primary">every student journey</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            From your first semester to graduation — and beyond. We're building
            the platform we wished existed when we started at SRM AP.
          </motion.p>
        </div>

        {/* Phases Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} />
          ))}
        </div>

        {/* Indigenous AI Card */}
        <motion.div
          ref={aiRef}
          initial={{ opacity: 0, y: 40 }}
          animate={aiInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden border border-primary/20 bg-card shadow-xl"
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent pointer-events-none" />

          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 p-10 md:p-14 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold tracking-widest uppercase">
                <Cpu className="w-3.5 h-3.5" />
                Next frontier
              </div>

              <h3 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
                Indigenous AI for{" "}
                <span className="bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                  SRM University AP
                </span>
              </h3>

              <p className="text-muted-foreground text-base leading-relaxed mb-6">
                The final frontier: an AI built <em>from</em> and <em>for</em>{" "}
                this university. Trained on anonymised student interactions,
                faculty patterns, and campus knowledge — it will answer
                questions that Google can't, because they're specific to SRM AP.
              </p>

              <ul className="space-y-3">
                {[
                  "AI mentor matching — not keyword search, real fit",
                  "Smart course recommendations based on your goals",
                  "Exam prep assistant trained on SRM AP syllabi",
                  "Faculty Q&A routing — ask the right professor, not any professor",
                  "Campus-aware chatbot: timetables, clubs, deadlines",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
                    <span className="text-sm text-muted-foreground leading-snug">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Visual metaphor */}
            <div className="flex items-center justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                {/* Pulsing rings */}
                {[0, 1, 2].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute inset-0 rounded-full border border-primary/20"
                    style={{
                      scale: 1 + ring * 0.18,
                      opacity: 1 - ring * 0.3,
                    }}
                    animate={{ scale: [1 + ring * 0.18, 1 + ring * 0.18 + 0.04, 1 + ring * 0.18] }}
                    transition={{
                      duration: 3 + ring * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: ring * 0.4,
                    }}
                  />
                ))}

                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30">
                    <Brain className="w-14 h-14 text-white" />
                  </div>
                </div>

                {/* Orbiting nodes */}
                {[
                  { angle: 0, label: "Mentor", icon: "🎓" },
                  { angle: 72, label: "Events", icon: "📅" },
                  { angle: 144, label: "Faculty", icon: "📖" },
                  { angle: 216, label: "Groups", icon: "👥" },
                  { angle: 288, label: "Posts", icon: "📝" },
                ].map((node) => {
                  const rad = (node.angle * Math.PI) / 180;
                  const r = 105; // orbit radius in px
                  const x = Math.cos(rad) * r;
                  const y = Math.sin(rad) * r;
                  return (
                    <motion.div
                      key={node.label}
                      className="absolute w-12 h-12 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-lg"
                      style={{
                        left: `calc(50% + ${x}px - 24px)`,
                        top: `calc(50% + ${y}px - 24px)`,
                      }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: node.angle / 360,
                      }}
                      title={node.label}
                    >
                      {node.icon}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="relative z-10 border-t border-border/60 bg-secondary/30 px-10 md:px-14 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Timeline:</strong> Ecosystem
              phases 3 &amp; 4 in active development. AI layer begins once
              student data reaches critical mass.
            </p>
            <span className="shrink-0 text-3xs font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary">
              Long-term vision
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
