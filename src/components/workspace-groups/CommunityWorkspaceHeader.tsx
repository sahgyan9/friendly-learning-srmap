import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Check,
  Globe,
  Plus,
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

import { Button } from "@/components/ui/button";
import { CommunityAvatar } from "@/components/workspace-groups/CommunityAvatar";
import { InviteLinkButton } from "@/components/workspace-groups/InviteLinkButton";
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

interface CommunityWorkspaceHeaderProps {
  community: Community;
  user: User | null;
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
  const [infoOpen, setInfoOpen] = useState(false);

  /** Primary CTA shown inline in the compact header */
  const renderPrimaryAction = () => {
    if (community.viewer_is_owner) {
      return (
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          You own this group
        </span>
      );
    }
    if (community.viewer_is_member) return null; // invite link is in the sheet
    if (community.is_archived) return null;
    if (community.visibility === "private") {
      if (community.viewer_has_invite) {
        return (
          <Button size="sm" onClick={onAcceptInvite} isLoading={working} className="shrink-0">
            {!working && <Check className="h-4 w-4" />}
            Accept invite
          </Button>
        );
      }
      if (community.viewer_has_requested) {
        return <Button variant="outline" size="sm" disabled className="shrink-0">Requested</Button>;
      }
      return (
        <Button size="sm" onClick={onRequestJoin} isLoading={working} className="shrink-0">
          {!working && <UserPlus className="h-4 w-4" />}
          Request to join
        </Button>
      );
    }
    return (
      <Button size="sm" onClick={onJoin} isLoading={working} className="shrink-0">
        {working ? null : user ? <Plus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        {user ? "Join group" : "Sign in to join"}
      </Button>
    );
  };

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card shadow-card">
        <div className="px-4 pb-4 pt-3">
          <div className="mb-2 flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="-ml-2 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
              <Link to="/workspace-groups" aria-label="Back to all communities">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <CommunityAvatar
                kind={community.kind}
                name={community.name}
                coverImage={community.cover_image}
                className="h-8 w-8 shrink-0 rounded-md border"
                iconClassName="h-4 w-4"
              />
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                {community.name}
              </h1>
              {community.visibility === "private" ? (
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Invite only" />
              ) : (
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Open group" />
              )}
              <span className="hidden shrink-0 items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground sm:inline-flex">
                <kind.icon className="h-3 w-3" aria-hidden />
                {kind.label}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="Group info and settings"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 sm:pl-9">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-sm text-muted-foreground">
                {community.description}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={onOpenMembersDrawer}
                  className="tabular inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 transition-colors hover:underline"
                >
                  <Users className="h-3.5 w-3.5" />
                  {community.member_count} {community.member_count === 1 ? "member" : "members"}
                </button>
                <span>Active {formatRelativeTime(community.last_activity_at)}</span>
              </div>
            </div>

            {renderPrimaryAction()}
          </div>
        </div>
      </div>

      {/* ── Workspace Info Sheet ── */}
      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-xl max-h-[85vh] overflow-y-auto overscroll-contain p-0 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] md:max-w-lg md:mx-auto md:bottom-6 md:rounded-xl md:border md:shadow-float md:inset-x-auto md:left-1/2 md:-translate-x-1/2"
        >
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
                className="h-10 w-10 shrink-0 rounded-lg border"
                iconClassName="h-5 w-5"
              />
              <div>
                <SheetTitle className="text-base font-semibold leading-tight">{community.name}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {community.visibility === "private" ? "Invite-only group" : "Open group"}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="px-5 space-y-4 pb-4">
            <Separator />

            {/* Full description */}
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">About</p>
              <p className="text-sm text-foreground leading-relaxed">{community.description}</p>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 text-sm">
              <div>
                <p className="tabular font-semibold text-foreground">{community.member_count}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div>
                <p className="tabular font-semibold text-foreground">{community.post_count}</p>
                <p className="text-xs text-muted-foreground">Discussions</p>
              </div>
            </div>

            {/* Owner */}
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Run by</p>
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
              <p className="text-2xs text-muted-foreground leading-relaxed">
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
                    Edit group
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete group
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {community.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes the group. Its posts, chat history and member
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
                          {deleting ? "Deleting" : "Delete group"}
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
                      className="w-full justify-start gap-2 text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive active:bg-destructive/15 transition-colors"
                      disabled={working}
                    >
                      <LogOut className="h-4 w-4" />
                      Leave group
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
                      <AlertDialogAction
                        onClick={() => { setInfoOpen(false); onLeave(); }}
                        disabled={working}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {working ? "Leaving" : "Leave group"}
                      </AlertDialogAction>
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
