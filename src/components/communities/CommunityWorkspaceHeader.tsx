import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clock,
  Globe,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommunityAvatar } from "@/components/communities/CommunityAvatar";
import { InviteLinkButton } from "@/components/communities/InviteLinkButton";
import { formatRelativeTime } from "@/utils/date-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getCommunityKindMeta, type Community } from "@/integrations/supabase/services/communities";
import { getKindStyle } from "@/integrations/supabase/services/community-kind-styles";

interface CommunityWorkspaceHeaderProps {
  community: Community;
  user: any;
  working: boolean;
  deleting: boolean;
  onJoin: () => void;
  onAcceptInvite: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onRequestJoin: () => void;
  onOpenCreatePost: () => void;
  onOpenEdit: () => void;
  onOpenMembersDrawer: () => void;
}

export function CommunityWorkspaceHeader({
  community,
  user,
  working,
  deleting,
  onJoin,
  onAcceptInvite,
  onLeave,
  onDelete,
  onRequestJoin,
  onOpenCreatePost,
  onOpenEdit,
  onOpenMembersDrawer,
}: CommunityWorkspaceHeaderProps) {
  const kind = getCommunityKindMeta(community.kind);
  const style = getKindStyle(community.kind);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm mb-6">
      {/* Decorative top ambient glow */}
      <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl bg-gradient-to-br ${style.hoverGlow}`} />

      {/* Back button */}
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link to="/communities">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All workspaces
        </Link>
      </Button>

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        {/* Identity & stats */}
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <CommunityAvatar
            kind={community.kind}
            name={community.name}
            coverImage={community.cover_image}
            className={`h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-2xl ring-2 ring-border ${style.avatarRing}`}
            iconClassName="h-8 w-8 md:h-10 md:w-10"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={`gap-1 ${style.pill}`}>
                <kind.icon className="h-3 w-3" aria-hidden />
                {kind.label}
              </Badge>

              {community.visibility === "private" ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Invite only
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-green-500/30 text-green-700 dark:text-green-400">
                  <Globe className="h-3 w-3" />
                  Open room
                </Badge>
              )}

              {community.is_archived && <Badge variant="outline">Archived</Badge>}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">
              {community.name}
            </h1>

            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed max-w-3xl">
              {community.description}
            </p>

            {/* Scannable stat pills */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={onOpenMembersDrawer}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-accent/30 px-3 py-1 font-medium text-foreground hover:bg-accent hover:border-primary/40 transition-colors"
                title="Click to view members drawer"
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                <span>{community.member_count} members</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Active {formatRelativeTime(community.last_activity_at)}
                </span>
              </button>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-accent/20 px-3 py-1 font-medium">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{community.post_count} discussions</span>
              </span>

              <span className="text-muted-foreground">
                Run by{" "}
                {community.owner.is_mentor ? (
                  <Link
                    to={`/mentor/${community.owner.id}`}
                    className="font-medium text-foreground hover:text-primary underline decoration-muted-foreground/40 underline-offset-2"
                  >
                    {community.owner.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{community.owner.name}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 shrink-0">
          {community.viewer_is_owner ? (
            <>
              <Badge variant="outline" className="h-9 items-center px-3 border-amber-500/30 text-amber-600 dark:text-amber-400">
                Workspace Owner
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Manage group">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onOpenEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit workspace
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(event) => event.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete workspace
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {community.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes the workspace—its posts, chat history and member
                          list all go with it. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onDelete}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? "Deleting..." : "Delete workspace"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : community.viewer_is_member ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={working}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave {community.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You'll stop being able to post here. Your existing posts stay, and you can
                    rejoin whenever you like.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay</AlertDialogCancel>
                  <AlertDialogAction onClick={onLeave}>Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : community.is_archived ? (
            <p className="text-sm text-muted-foreground">
              This workspace has been archived.
            </p>
          ) : community.visibility === "private" ? (
            community.viewer_has_invite ? (
              <Button onClick={onAcceptInvite} disabled={working}>
                {working ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Accept invitation
              </Button>
            ) : community.viewer_has_requested ? (
              <Button variant="outline" disabled>
                Requested
              </Button>
            ) : (
              <Button onClick={onRequestJoin} disabled={working}>
                <UserPlus className="mr-2 h-4 w-4" />
                Request to join
              </Button>
            )
          ) : (
            <Button onClick={onJoin} disabled={working}>
              {working ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : user ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {user ? "Join room" : "Sign in to join"}
            </Button>
          )}

          {community.viewer_can_post && (
            <Button variant="secondary" onClick={onOpenCreatePost}>
              <Plus className="mr-2 h-4 w-4" />
              New post
            </Button>
          )}

          {!community.is_archived && (
            <InviteLinkButton slug={community.slug} name={community.name} />
          )}
        </div>
      </div>
    </div>
  );
}

export default CommunityWorkspaceHeader;
