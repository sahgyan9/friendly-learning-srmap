
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
  Megaphone,
  BookOpen,
  SearchX,
  AlertTriangle
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

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
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* The width transition is CSS so the rail collapses without a JS
            animation loop; labels are simply hidden when collapsed. */}
        <aside
          className={cn(
            "sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out-quart",
            collapsed ? "w-16" : "w-64",
          )}
          aria-label="Admin navigation"
        >
          <div
            className={cn(
              "flex h-14 items-center border-b border-border",
              collapsed ? "justify-center px-2" : "justify-between pl-4 pr-2",
            )}
          >
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">Admin console</p>
                <p className="truncate text-2xs text-muted-foreground">Friendly Learning</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="space-y-0.5">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    title={collapsed ? item.name : undefined}
                    aria-current={item.current ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-md text-sm transition-colors duration-150",
                      collapsed ? "justify-center px-0" : "px-3",
                      item.current
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {item.current && !collapsed && (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden="true" />
                    )}
                    <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content. min-w-0 lets this flex child shrink below its
            content's intrinsic width — without it, a wide card or table
            inside pushes the whole row wider than the viewport instead of
            wrapping or scrolling internally. */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
