
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  BookOpen,
  Award,
  UserCheck,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";
import { motion } from "framer-motion";

const AdminDashboard = () => {

  const adminModules = [
    {
      title: "Badge Management",
      description: "Create, manage, and award badges to mentors.",
      icon: Award,
      path: "/admin/badges",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      title: "Mentor Verification",
      description: "Review and approve mentor applications.",
      icon: UserCheck,
      path: "/admin/mentor-verification",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: "Team Members",
      description: "Manage team members displayed on the about page.",
      icon: Users,
      path: "/admin/team-members",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Faculty Management",
      description: "Add, edit, or remove SRMAP faculty for anonymous ratings.",
      icon: GraduationCap,
      path: "/admin/faculty",
      gradient: "from-teal-500 to-emerald-500",
    },
    {
      title: "Marketplace",
      description: "Manage news, events and marketplace posts.",
      icon: ShoppingBag,
      path: "/admin/marketplace",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Admin Settings",
      description: "Manage admin users and system settings.",
      icon: Settings,
      path: "/admin/settings",
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      title: "Documentation",
      description: "Admin documentation and guidelines.",
      icon: BookOpen,
      path: "/admin/docs",
      disabled: true, // This route doesn't exist yet
      gradient: "from-slate-500 to-gray-500",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <AdminPageWrapper>
      <AdminHeader
        title="Admin Dashboard"
        description="Welcome to the admin area. Manage your site content and settings from here."
      />

      <motion.div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {adminModules.map((module, index) => (
          <motion.div
            key={module.title}
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className={`overflow-hidden h-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-300 relative group ${module.disabled ? 'opacity-60' : ''}`}>
              {/* Animated background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              {/* Floating icon background */}
              <motion.div
                className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${module.gradient} opacity-10 rounded-full blur-2xl`}
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-start justify-between">
                  <motion.div
                    className={`p-3 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <module.icon className="h-6 w-6 text-white" />
                  </motion.div>

                  {!module.disabled && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <ArrowRight className="h-5 w-5 text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                    </motion.div>
                  )}
                </div>

                <CardTitle className="flex items-center gap-2 mt-4 text-slate-900 dark:text-slate-100">
                  {module.title}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {module.description}
                </CardDescription>
              </CardHeader>

              <CardFooter className="pt-3 relative z-10">
                <Button
                  asChild
                  variant="default"
                  className={`w-full bg-gradient-to-r ${module.gradient} hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-300 group/btn`}
                  disabled={module.disabled}
                >
                  <Link to={module.path}>
                    <span>Access {module.title}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </AdminPageWrapper>
  );
};

export default AdminDashboard;
