import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserCircle,
  Users,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CreatePostButton } from "@/components/community/CreatePostButton";

/**
 * Quickstart strip — placed between the Posts section and the Groups section.
 *
 * Answers "what can I do here right now?" for a visitor who has just scrolled
 * through live community content and is starting to feel the pull.
 *
 * Auth-aware: "Set Up Profile" becomes "View Your Profile" when the visitor
 * is already signed in. The Post Now button opens the create-post modal inline
 * for logged-in users; unauthenticated visitors are nudged to sign up.
 */
export function AboutQuickstartStrip() {
  const { user } = useAuth();

  const actions = [
    {
      id: "profile",
      icon: <UserCircle className="w-4 h-4" />,
      label: user ? "View Your Profile" : "Set Up Profile",
      href: user ? "/profile" : "/signup",
      accent:
        "border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50",
    },
    {
      id: "events",
      icon: <CalendarDays className="w-4 h-4" />,
      label: "University Events",
      href: "/marketplace",
      accent:
        "border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/8 hover:border-violet-500/50",
    },
    {
      id: "group",
      icon: <Users className="w-4 h-4" />,
      label: "Make a Group",
      href: "/communities",
      accent:
        "border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/8 hover:border-amber-500/50",
    },
    {
      id: "certificate",
      icon: <BadgeCheck className="w-4 h-4" />,
      label: "Earn Certificate",
      href: "/certificate",
      accent:
        "border-teal-500/30 text-teal-700 dark:text-teal-400 hover:bg-teal-500/8 hover:border-teal-500/50",
    },
  ] as const;

  return (
    <section className="relative overflow-hidden border-y border-border/40 bg-gradient-to-br from-primary/5 via-background to-background py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-24 -top-16 h-56 w-56 rounded-full bg-primary/6 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-emerald-500/5 blur-2xl" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16">
          {/* Left — voice copy */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="max-w-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              SRM AP students built this
            </p>
            <h2 className="text-2xl font-bold tracking-tight leading-snug mb-3">
              You're already in the right place.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Here's what to do next — pick one, start there. Everything else
              will follow.
            </p>
          </motion.div>

          {/* Right — action buttons */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex flex-1 flex-wrap gap-3"
          >
            {/* Post Now — CreatePostButton handles auth check internally:
                shows the create modal for signed-in users, redirects to /signin otherwise */}
            <CreatePostButton
              onPostCreated={() => {}}
              label="Post Now"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-transparent px-4 py-2 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-500/8 hover:border-emerald-500/50 dark:text-emerald-400 shadow-none"
            />

            {actions.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              >
                <Link
                  to={action.href}
                  className={`inline-flex items-center gap-2 rounded-full border bg-transparent px-4 py-2 text-sm font-semibold transition-all duration-200 ${action.accent}`}
                >
                  {action.icon}
                  {action.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
