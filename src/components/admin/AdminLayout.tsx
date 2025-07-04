
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Users,
  Settings,
  BarChart3,
  Award,
  UserCheck,
  ShoppingCart,
  MessageSquare,
  Mail
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: BarChart3,
      current: location.pathname === "/admin",
    },
    {
      name: "Badges",
      href: "/admin/badges",
      icon: Award,
      current: location.pathname === "/admin/badges",
    },
    {
      name: "Mentor Verification",
      href: "/admin/mentor-verification",
      icon: UserCheck,
      current: location.pathname === "/admin/mentor-verification",
    },
    {
      name: "Contact Messages",
      href: "/admin/contact-messages",
      icon: Mail,
      current: location.pathname === "/admin/contact-messages",
    },
    {
      name: "Team Members",
      href: "/admin/team-members",
      icon: Users,
      current: location.pathname === "/admin/team-members",
    },
    {
      name: "Marketplace",
      href: "/admin/marketplace",
      icon: ShoppingCart,
      current: location.pathname === "/admin/marketplace",
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      current: location.pathname === "/admin/settings",
    },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-card overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
          </div>
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      item.current
                        ? "bg-primary/10 text-primary border-r-2 border-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-l-md transition-colors duration-200"
                    )}
                  >
                    <Icon
                      className={cn(
                        item.current ? "text-primary" : "text-muted-foreground",
                        "mr-3 flex-shrink-0 h-5 w-5"
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile menu button and content */}
      <div className="md:hidden w-full">
        <div className="flex flex-wrap gap-2 p-4 border-b bg-card">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                  "flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors duration-200"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
