
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
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
  Mail,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/integrations/supabase/services/admin";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        if (user) {
          const adminStatus = await isUserAdmin(user.id);
          setIsAdmin(adminStatus);
          
          if (!adminStatus) {
            navigate('/unauthorized');
            toast({
              title: "Access Denied",
              description: "You don't have administrator privileges.",
              variant: "destructive",
            });
          }
        } else {
          navigate('/signin');
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast({
          title: "Error",
          description: "Failed to verify admin privileges.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, navigate, toast]);

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
      title: "Contact Messages",
      description: "Manage and respond to user inquiries.",
      icon: Mail,
      path: "/admin/contact-messages",
    },
    {
      title: "Team Members",
      description: "Manage team members displayed on the about page.",
      icon: Users,
      path: "/admin/team-members",
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
      disabled: true,
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-lg text-muted-foreground">Loading admin dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
    </AdminLayout>
  );
};

export default AdminDashboard;
