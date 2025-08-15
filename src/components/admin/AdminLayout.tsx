
import { ReactNode } from "react";
import { 
  Users, 
  MessageSquare, 
  Award, 
  Settings, 
  Shield,
  UserCheck, 
  UsersIcon,
  ShoppingCart,
  BarChart3
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: BarChart3,
      current: location.pathname === "/admin",
    },
    {
      name: "Contact Messages",
      href: "/admin/contact-messages", 
      icon: MessageSquare,
      current: location.pathname === "/admin/contact-messages",
    },
    {
      name: "Mentor Verification",
      href: "/admin/mentor-verification",
      icon: UserCheck,
      current: location.pathname === "/admin/mentor-verification",
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
      name: "Marketplace",
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen pt-6">
          <div className="px-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          </div>
          <nav className="px-3">
            <ul className="space-y-1">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      item.current
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        item.current
                          ? "text-primary-foreground"
                          : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
