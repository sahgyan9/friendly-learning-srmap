
import { ReactNode, useState } from "react";
import {
  Users,
  MessageSquare,
  Award,
  Settings,
  Shield,
  UserCheck,
  UsersIcon,
  ShoppingCart,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Mail,
  Sparkles,
  Megaphone,
  BookOpen,
  SearchX,
  AlertTriangle
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  // Starting expanded is fine at desktop widths, but the full 280px sidebar
  // plus its text labels ("Contact Messages", "Mentor Verification") does not
  // fit next to any content on a 360px phone — it forced the whole page to
  // scroll sideways. Collapsing to the icon-only rail by default below `lg`
  // (this component's own breakpoint elsewhere) reuses the collapse this
  // sidebar already had for desktop rather than adding a second nav pattern.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: BarChart3,
      current: location.pathname === "/admin",
    },
    {
      name: "Search Insights",
      href: "/admin/search-insights",
      icon: SearchX,
      current: location.pathname === "/admin/search-insights",
    },
    {
      name: "Contact Messages",
      href: "/admin/contact-messages",
      icon: MessageSquare,
      current: location.pathname === "/admin/contact-messages",
    },
    {
      name: "Error Reports",
      href: "/admin/error-reports",
      icon: AlertTriangle,
      current: location.pathname === "/admin/error-reports",
    },
    {
      name: "Mentor Verification",
      href: "/admin/mentor-verification",
      icon: UserCheck,
      current: location.pathname === "/admin/mentor-verification",
    },
    {
      name: "Notices",
      href: "/admin/notices",
      icon: Megaphone,
      current: location.pathname === "/admin/notices",
    },
    {
      name: "Knowledge Articles",
      href: "/admin/articles",
      icon: BookOpen,
      current: location.pathname === "/admin/articles",
    },
    {
      name: "Welcome Emails",
      href: "/admin/welcome-emails",
      icon: Mail,
      current: location.pathname === "/admin/welcome-emails",
    },
    {
      name: "Badge Management",
      href: "/admin/badges",
      icon: Award,
      current: location.pathname === "/admin/badges",
    },
    {
      name: "Team Members",
      href: "/admin/team-members",
      icon: UsersIcon,
      current: location.pathname === "/admin/team-members",
    },
    {
      // Changed label from 'Marketplace' to 'Events' for frontend only. Backend and route remain 'marketplace'.
      name: "Events",
      href: "/admin/marketplace",
      icon: ShoppingCart,
      current: location.pathname === "/admin/marketplace",
    },
    {
      name: "Security",
      href: "/admin/security",
      icon: Shield,
      current: location.pathname === "/admin/security",
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      current: location.pathname === "/admin/settings",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="flex relative">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600 rounded-full opacity-20 blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-400 dark:from-blue-600 dark:to-cyan-600 rounded-full opacity-20 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Sidebar */}
        <motion.div
          animate={{
            width: collapsed ? "80px" : "280px",
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl border-r border-slate-200 dark:border-slate-700 min-h-screen pt-6 z-10"
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-slate-900/50 pointer-events-none" />

          <div className="relative">
            {/* Header with animated sparkles */}
            <div className="px-6 pb-6 flex items-center justify-between">
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2"
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </motion.div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                      Admin Panel
                    </h2>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setCollapsed(!collapsed)}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                )}
              </motion.button>
            </div>

            {/* Navigation */}
            <nav className="px-3">
              <ul className="space-y-2">
                {navigationItems.map((item, index) => (
                  <motion.li
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.3,
                    }}
                  >
                    <Link to={item.href}>
                      <motion.div
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all relative overflow-hidden",
                          item.current
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 text-white shadow-lg shadow-purple-500/30"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {/* Animated background for active item */}
                        {item.current && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0"
                            animate={{
                              opacity: [0, 0.3, 0],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        )}

                        <motion.div
                          animate={item.current ? {
                            rotate: [0, 5, -5, 0],
                          } : {}}
                          transition={{
                            duration: 0.5,
                            repeat: item.current ? Infinity : 0,
                            repeatDelay: 3,
                          }}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 flex-shrink-0 transition-colors",
                              collapsed ? "" : "mr-3",
                              item.current
                                ? "text-white"
                                : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                            )}
                          />
                        </motion.div>

                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                              className="relative z-10"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
          </div>
        </motion.div>

        {/* Main content. min-w-0 lets this flex child shrink below its
            content's intrinsic width — without it, a wide card or table
            inside pushes the whole row wider than the viewport instead of
            wrapping or scrolling internally. */}
        <div className="min-w-0 flex-1 p-4 relative z-0 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
