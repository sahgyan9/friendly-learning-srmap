import React from "react";
import { ChevronRight, FolderGit2, Hash, MessageSquare, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
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
      <nav aria-label="Channels" className="space-y-1 rounded-lg border bg-card p-2 shadow-card">
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            Channels
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Plus className="h-4 w-4" />
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
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md px-2.5 text-left text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{view.label}</span>
              </div>

              {view.badge ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {view.badge}
                </span>
              ) : view.count !== undefined && view.count > 0 ? (
                <span className="tabular text-xs text-muted-foreground">
                  {view.count}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* The owner's own channels. Below the built-in views rather than mixed
            into them: these are rooms someone chose to make, and the separator
            is what keeps a group with none looking exactly as it did before. */}
        {channels.length > 0 && (
          <div className="!mt-2 space-y-1 border-t pt-2">
            {channels.map((channel) => {
              const id = channelTabId(channel.slug);
              const isActive = activeTab === id;

              return (
                <div key={channel.id} className="group/channel relative">
                  <button
                    type="button"
                    onClick={() => onSelectTab(id)}
                    title={channel.topic ?? undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md px-2.5 text-left text-sm font-medium transition-colors duration-150",
                      canManageChannels && "pr-11 [@media(hover:hover)]:pr-2.5 [@media(hover:hover)]:group-hover/channel:pr-11",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Hash className="h-4 w-4 shrink-0" />
                      <span className="truncate">{channel.slug}</span>
                    </div>

                    {channel.messageCount > 0 && (
                      <span className="tabular text-xs text-muted-foreground">
                        {channel.messageCount}
                      </span>
                    )}
                  </button>

                  {canManageChannels && (
                    <button
                      type="button"
                      onClick={() => onDeleteChannel(channel)}
                      aria-label={`Remove #${channel.slug}`}
                      title={`Remove #${channel.slug}`}
                      className={cn(
                        // Always visible on touch screens; revealed on hover only
                        // where hover exists, so phones are not left without it.
                        "absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-opacity duration-150 hover:bg-destructive/10 hover:text-destructive focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/channel:opacity-100",
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
          <p className="px-2.5 pb-1 pt-2 text-xs leading-relaxed text-muted-foreground">
            Add a channel when one topic keeps interrupting another — a room for
            resources, or one for announcements.
          </p>
        )}

        {/* Compact member row — inside the channel card */}
        <div className="!mt-2 border-t pt-2">
          <button
            type="button"
            onClick={onOpenMembersDrawer}
            className="flex h-10 w-full items-center justify-between rounded-md px-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          >
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4" />
              <span className="tabular font-medium text-foreground">{community.member_count} {community.member_count === 1 ? "member" : "members"}</span>
            </div>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </nav>
    </div>
  );
}

export default CommunityWorkspaceSidebar;
