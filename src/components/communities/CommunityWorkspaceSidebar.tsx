import React from "react";
import { Hash, MessageSquare, ShieldCheck, Sparkles, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/date-utils";
import { type Community } from "@/integrations/supabase/services/communities";

interface CommunityWorkspaceSidebarProps {
  community: Community;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMembersDrawer: () => void;
}

export function CommunityWorkspaceSidebar({
  community,
  activeTab,
  onSelectTab,
  onOpenMembersDrawer,
}: CommunityWorkspaceSidebarProps) {
  const channels = [
    {
      id: "chat",
      label: "general-chat",
      icon: Hash,
      description: "Real-time group discussion",
      badge: "Live",
    },
    {
      id: "posts",
      label: "discussions-posts",
      icon: MessageSquare,
      description: "Long-form posts & ideas",
      count: community.post_count,
    },
  ];

  if (community.viewer_is_owner && community.visibility === "private") {
    channels.push({
      id: "requests",
      label: "join-requests",
      icon: UserCheck,
      description: "Pending membership requests",
      count: community.pending_request_count ?? 0,
    });
  }

  return (
    <div className="space-y-4">
      {/* Today's Activity Pulse Card (Commented out)
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
          <Sparkles className="h-4 w-4" />
          <span>Today's Activity</span>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Members</span>
            <span className="font-semibold text-foreground">{community.member_count} active</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Discussions</span>
            <span className="font-semibold text-foreground">{community.post_count} posts</span>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active {formatRelativeTime(community.last_activity_at)}</span>
          </div>
        </div>
      </div>
      */}

      {/* Navigation Channels */}
      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspace Channels
        </div>

        {channels.map((channel) => {
          const Icon = channel.icon;
          const isActive = activeTab === channel.id;

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelectTab(channel.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="truncate">#{channel.label}</span>
              </div>

              {channel.badge ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 font-semibold",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {channel.badge}
                </Badge>
              ) : channel.count !== undefined && channel.count > 0 ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {channel.count}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Member Directory Drawer Trigger */}
      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-foreground">Workspace Members</span>
          <Badge variant="outline" className="text-[10px]">
            {community.member_count}
          </Badge>
        </div>

        <button
          type="button"
          onClick={onOpenMembersDrawer}
          className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-accent/30 p-2.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span>View directory & roles</span>
          </div>
          <span className="text-primary font-semibold">Open →</span>
        </button>
      </div>

      {/* Guidelines info */}
      <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Student Community</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Be respectful, share constructive resources, and keep conversation productive for everyone in SRMAP.
        </p>
      </div>
    </div>
  );
}

export default CommunityWorkspaceSidebar;
