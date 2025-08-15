
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
} from "lucide-react";
import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";

const AdminDashboard = () => {

  const adminModules = [
    {
      title: "Badge Management",
      description: "Create, manage, and award badges to mentors.",
      icon: Award,
      path: "/admin/badges",
    },
    {
      title: "Mentor Verification",
      description: "Review and approve mentor applications.",
      icon: UserCheck,
      path: "/admin/mentor-verification",
    },
    {
      title: "Team Members",
      description: "Manage team members displayed on the about page.",
      icon: Users,
      path: "/admin/team-members", // Fixed path to match the route in App.tsx
    },
    {
      title: "Marketplace",
      description: "Manage news, events and marketplace posts.",
      icon: ShoppingBag,
      path: "/admin/marketplace",
    },
    {
      title: "Admin Settings",
      description: "Manage admin users and system settings.",
      icon: Settings,
      path: "/admin/settings",
    },
    {
      title: "Documentation",
      description: "Admin documentation and guidelines.",
      icon: BookOpen,
      path: "/admin/docs",
      disabled: true, // This route doesn't exist yet
    },
  ];

  return (
    <AdminPageWrapper>
      <AdminHeader
        title="Admin Dashboard"
        description="Welcome to the admin area. Manage your site content and settings from here."
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {adminModules.map((module) => (
          <Card key={module.title} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <module.icon className="h-5 w-5" />
                {module.title}
              </CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardFooter className="pt-3">
              <Button 
                asChild 
                variant="default" 
                className="w-full" 
                disabled={module.disabled}
              >
                <Link to={module.path}>
                  Access {module.title}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </AdminPageWrapper>
  );
};

export default AdminDashboard;
