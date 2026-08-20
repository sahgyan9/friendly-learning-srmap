import React from "react";
import { FolderGit2, Hash, MessageSquare, Plus, Sparkles, Trash2, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/date-utils";
import { type Community } from "@/integrations/supabase/services/communities";
import {
  MAX_CHANNELS,
  type CommunityChannel,
} from "@/integrations/supabase/services/community-channels";

interface CommunityWorkspaceSidebarProps {
  community: Community;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenMembersDrawer: () => void;
  /** Rooms the owner has added. Empty for a group that never made any. */
  channels?: CommunityChannel[];
  /** Only the owner (and admins) get the add and remove controls. */
  canManageChannels?: boolean;
  onCreateChannel?: () => void;
  onDeleteChannel?: (channel: CommunityChannel) => void;
}

/** The tab id for one of the owner's channels. Namespaced so a channel called
 *  "posts" can never collide with the built-in views. */
export const channelTabId = (slug: string) => `channel:${slug}`;

export function CommunityWorkspaceSidebar({
  community,
  activeTab,
  onSelectTab,
  onOpenMembersDrawer,
  channels = [],
  canManageChannels = false,
  onCreateChannel,
  onDeleteChannel,
}: CommunityWorkspaceSidebarProps) {
  const views = [
    {
      id: "chat",
      label: "general-chat",
      icon: Hash,
      description: "Real-time group discussion",
      badge: "Live",
    },
    {
      id: "resources",
      label: "resources-hub",
      icon: FolderGit2,
      description: "Shared repos, Drive & notes",
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
    views.push({
      id: "requests",
      label: "join-requests",
      icon: UserCheck,
      description: "Pending membership requests",
      count: community.pending_request_count ?? 0,
    });
  }

  const atChannelLimit = channels.length >= MAX_CHANNELS;

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
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Workspace Channels
          </span>

          {/* Owner-only. Disabled rather than hidden at the cap, so the reason
              the button stopped working is legible instead of mysterious. */}
          {canManageChannels && (
            <button
              type="button"
              onClick={onCreateChannel}
              disabled={atChannelLimit}
              title={
                atChannelLimit
                  ? `A group can have ${MAX_CHANNELS} channels`
                  : "Add a channel"
              }
              aria-label="Add a channel"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/70 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {views.map((view) => {
          const Icon = view.icon;
          const isActive = activeTab === view.id;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onSelectTab(view.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span className="truncate">#{view.label}</span>
              </div>

              {view.badge ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4 font-semibold",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {view.badge}
                </Badge>
              ) : view.count !== undefined && view.count > 0 ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-4",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {view.count}
                </Badge>
              ) : null}
            </button>
          );
        })}

        {/* The owner's own channels. Below the built-in views rather than mixed
            into them: these are rooms someone chose to make, and the separator
            is what keeps a group with none looking exactly as it did before. */}
        {channels.length > 0 && (
          <div className="!mt-2 space-y-1 border-t border-border/50 pt-2">
            {channels.map((channel) => {
              const id = channelTabId(channel.slug);
              const isActive = activeTab === id;

              return (
                <div key={channel.id} className="group/channel relative">
                  <button
                    type="button"
                    onClick={() => onSelectTab(id)}
                    title={channel.topic ?? undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Hash
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                      {/* The literal # matches the built-in rows above, which
                          carry it in their label text alongside the icon. */}
                      <span className="truncate">#{channel.slug}</span>
                    </div>

                    {/* The count shifts left on hover so the remove control has
                        somewhere to sit without covering it. */}
                    {channel.messageCount > 0 && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-4 px-1.5 py-0 text-[10px] transition-transform",
                          canManageChannels && "group-hover/channel:-translate-x-6",
                          isActive
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {channel.messageCount}
                      </Badge>
                    )}
                  </button>

                  {canManageChannels && (
                    <button
                      type="button"
                      onClick={() => onDeleteChannel(channel)}
                      aria-label={`Remove #${channel.slug}`}
                      title={`Remove #${channel.slug}`}
                      className={cn(
                        "absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/channel:opacity-100",
                        isActive
                          ? "text-primary-foreground hover:bg-primary-foreground/20"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Said once, to the one person who can act on it, and only while the
            group has no channels of its own. */}
        {canManageChannels && channels.length === 0 && (
          <p className="px-3 pb-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            Add a channel when one topic keeps interrupting another — a room for
            resources, or one for announcements.
          </p>
        )}

        {/* Compact member row — inside the channel card */}
        <div className="!mt-2 border-t border-border/50 pt-2">
          <button
            type="button"
            onClick={onOpenMembersDrawer}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium text-foreground">{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
            </div>
            <span className="text-primary font-semibold text-[11px]">Directory →</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommunityWorkspaceSidebar;
