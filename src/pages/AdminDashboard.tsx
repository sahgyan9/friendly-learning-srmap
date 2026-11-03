
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  BookOpen,
  Award,
  UserCheck,
  ChevronRight,
  MessageSquare,
  Megaphone,
  SearchX,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";
import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";
import PlatformHealthPanel from "@/components/admin/PlatformHealthPanel";
import KpiPanel from "@/components/admin/KpiPanel";
import { syncSRMAPEvents } from "@/integrations/supabase/services/marketplace";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [isSyncingEvents, setIsSyncingEvents] = useState(false);

  const handleSyncEvents = async () => {
    try {
      setIsSyncingEvents(true);
      const res = await syncSRMAPEvents();
      toast.success("Events synced", {
        description: `${res.synced} events imported from the SRMAP portal.`,
      });
    } catch (error) {
      console.error("Error syncing events:", error);
      toast.error("Could not sync events", {
        description: error instanceof Error ? error.message : "The SRMAP portal did not respond. Try again.",
      });
    } finally {
      setIsSyncingEvents(false);
    }
  };

  const adminModules = [
    {
      title: "Well-being Moderation",
      description: "Review distress keyword flags, peer reports, and unmasking requests.",
      icon: HeartPulse,
      path: "/admin/moderation",
    },
    {
      title: "AI Feedback",
      description: "Review and act on AI Campus Overview feedback.",
      icon: MessageSquare,
      path: "/admin/ai-feedback",
    },
    {
      title: "Error Reports",
      description: "Errors students flagged with the 'Report' button on a toast.",
      icon: AlertTriangle,
      path: "/admin/error-reports",
    },
    {
      title: "Search Insights",
      description: "See what students searched for — and what search missed.",
      icon: SearchX,
      path: "/admin/search-insights",
    },
    {
      title: "Badge Management",
      description: "Create, manage, and award badges to mentors.",
      icon: Award,
      path: "/admin/badges",
    },
    {
      title: "Notices",
      description: "Publish circulars and notices — searchable in Ask AI.",
      icon: Megaphone,
      path: "/admin/notices",
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
        title="Dashboard"
        description="Platform health, usage, and shortcuts to every admin tool."
        action={
          <Button variant="outline" onClick={handleSyncEvents} isLoading={isSyncingEvents}>
            {!isSyncingEvents && <RefreshCw className="h-4 w-4" />}
            {isSyncingEvents ? "Syncing events" : "Sync SRMAP events"}
          </Button>
        }
      />

      <KpiPanel />
      <PlatformHealthPanel />

      <section aria-labelledby="admin-tools-heading" className="mt-10">
        <h2 id="admin-tools-heading" className="mb-3 text-base font-semibold text-foreground">
          Tools
        </h2>
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card md:grid-cols-2 xl:grid-cols-3">
          {adminModules.map((module, index) => {
            const body = (
              <>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <module.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{module.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{module.description}</p>
                </div>
                {!module.disabled && (
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />
                )}
              </>
            );
            return (
              <li
                key={module.title}
                className="min-w-0 animate-fade-up bg-card"
                style={index < 6 ? { animationDelay: `${index * 35}ms` } : undefined}
              >
                {module.disabled ? (
                  <div className="flex items-start gap-3 p-4 opacity-60" aria-disabled="true">
                    {body}
                  </div>
                ) : (
                  <Link
                    to={module.path}
                    className="group flex h-full items-start gap-3 p-4 transition-colors duration-150 hover:bg-accent"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </AdminPageWrapper>
  );
};

export default AdminDashboard;
