import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Globe,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
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
  const [infoOpen, setInfoOpen] = useState(false);

  /** Primary CTA shown inline in the compact header */
  const renderPrimaryAction = () => {
    if (community.viewer_is_owner) {
      return (
        <Badge variant="outline" className="h-8 items-center px-3 border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs shrink-0">
          Owner
        </Badge>
      );
    }
    if (community.viewer_is_member) return null; // invite link is in the sheet
    if (community.is_archived) return null;
    if (community.visibility === "private") {
      if (community.viewer_has_invite) {
        return (
          <Button size="sm" onClick={onAcceptInvite} disabled={working} className="shrink-0">
            {working ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            Accept invite
          </Button>
        );
      }
      if (community.viewer_has_requested) {
        return <Button variant="outline" size="sm" disabled className="shrink-0">Requested</Button>;
      }
      return (
        <Button size="sm" onClick={onRequestJoin} disabled={working} className="shrink-0">
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Request to join
        </Button>
      );
    }
    return (
      <Button size="sm" onClick={onJoin} disabled={working} className="shrink-0">
        {working ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : user ? (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <LogIn className="mr-1.5 h-3.5 w-3.5" />
        )}
        {user ? "Join room" : "Sign in to join"}
      </Button>
    );
  };

  return (
    <>
      {/* â”€â”€ Compact workspace header â”€â”€ */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm mb-4">
        {/* Decorative ambient glow */}
        <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-3xl bg-gradient-to-br ${style.hoverGlow}`} />

        <div className="relative px-4 pt-3 pb-4">
          {/* Row 1: back Â· avatar Â· kind badge Â· name Â· lock/globe Â· â‹¯ */}
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground -ml-1">
              <Link to="/workspace-groups" aria-label="Back to all workspaces">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <CommunityAvatar
                kind={community.kind}
                name={community.name}
                coverImage={community.cover_image}
                className={`h-7 w-7 shrink-0 rounded-lg ring-1 ring-border ${style.avatarRing}`}
                iconClassName="h-3.5 w-3.5"
              />
              <Badge variant="secondary" className={`gap-1 shrink-0 text-[10px] py-0 h-5 ${style.pill}`}>
                <kind.icon className="h-2.5 w-2.5" aria-hidden />
                {kind.label}
              </Badge>
              <h1 className="truncate text-base font-bold tracking-tight text-foreground">
                {community.name}
              </h1>
              {community.visibility === "private" ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Invite only" />
              ) : (
                <Globe className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" aria-label="Open room" />
              )}
            </div>

            {/* â‹¯ info/management sheet trigger */}
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Workspace info and settings"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Row 2: description Â· stats Â· primary action */}
          <div className="flex items-center gap-3 pl-8">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-xs text-muted-foreground leading-relaxed">
                {community.description}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <button
                  type="button"
                  onClick={onOpenMembersDrawer}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
                >
                  <Users className="h-3 w-3" />
                  {community.member_count} {community.member_count === 1 ? "member" : "members"}
                </button>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Active {formatRelativeTime(community.last_activity_at)}
                  </span>
                </span>
              </div>
            </div>

            {renderPrimaryAction()}
          </div>
        </div>
      </div>

      {/* â”€â”€ Workspace Info Sheet â”€â”€ */}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
          {/* Drag handle */}
          <div className="flex flex-col items-center pt-3 pb-2">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="px-5 pb-3">
            <div className="flex items-center gap-3">
              <CommunityAvatar
                kind={community.kind}
                name={community.name}
                coverImage={community.cover_image}
                className={`h-10 w-10 shrink-0 rounded-xl ring-2 ring-border ${style.avatarRing}`}
                iconClassName="h-5 w-5"
              />
              <div>
                <SheetTitle className="text-base font-bold leading-tight">{community.name}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {community.visibility === "private" ? "Invite-only workspace" : "Open workspace"}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="px-5 space-y-4 pb-2">
            <Separator />

            {/* Full description */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">About</p>
              <p className="text-sm text-foreground leading-relaxed">{community.description}</p>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 text-sm">
              <div>
                <p className="font-semibold text-foreground">{community.member_count}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">{community.post_count}</p>
                <p className="text-xs text-muted-foreground">Discussions</p>
              </div>
            </div>

            {/* Owner */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Run by</p>
              {community.owner.is_mentor ? (
                <Link
                  to={`/mentor/${community.owner.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setInfoOpen(false)}
                >
                  {community.owner.name}
                </Link>
              ) : (
                <p className="text-sm font-medium text-foreground">{community.owner.name}</p>
              )}
            </div>

            <Separator />

            {/* Community guidelines */}
            <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Community guidelines
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Be respectful, share constructive resources, and keep conversation productive for everyone in SRMAP.
              </p>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              {!community.is_archived && (
                <InviteLinkButton slug={community.slug} name={community.name} />
              )}

              {community.viewer_is_owner && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => { setInfoOpen(false); onOpenEdit(); }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit workspace
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete workspace
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {community.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes the workspaceâ€”its posts, chat history and member
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
                </>
              )}

              {community.viewer_is_member && !community.viewer_is_owner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5"
                      disabled={working}
                    >
                      <LogOut className="h-4 w-4" />
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
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default CommunityWorkspaceHeader;
