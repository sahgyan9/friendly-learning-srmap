import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  HeartPulse,
  AlertTriangle,
  HeartHandshake,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldAlert,
} from "lucide-react";

import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getModerationQueue,
  revealModerationAuthor,
  updateModerationStatus,
  type ModerationQueueItem,
} from "@/integrations/supabase/services/community-posts";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "new" | "contacted" | "resolved";

const STATUS_VARIANTS: Record<ModerationQueueItem["status"], { label: string; className: string }> = {
  new: { label: "New", className: "bg-destructive/15 text-destructive border-destructive/30" },
  contacted: { label: "Contacted", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

export default function AdminModerationQueue() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterStatus>("all");

  // Reveal Dialog State
  const [revealTarget, setRevealTarget] = useState<ModerationQueueItem | null>(null);
  const [revealReason, setRevealReason] = useState("");
  const [revealing, setRevealing] = useState(false);

  // Status Note Updating State
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    const { data, error } = await getModerationQueue();
    if (error) {
      toast.error("Failed to load moderation queue");
      console.error(error);
    } else if (data) {
      setItems(data);
      const initialNotes: Record<string, string> = {};
      data.forEach((item) => {
        initialNotes[item.id] = item.admin_notes || "";
      });
      setNotesState(initialNotes);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchQueue();
      setLoading(false);
    };
    load();
  }, [fetchQueue]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQueue();
    setRefreshing(false);
    toast.success("Moderation queue refreshed");
  };

  const handleRevealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealTarget) return;

    if (!revealReason.trim() || revealReason.trim().length < 5) {
      toast.error("Please provide a clear justification (at least 5 characters).");
      return;
    }

    try {
      setRevealing(true);
      const { data, error } = await revealModerationAuthor(revealTarget.id, revealReason.trim());
      if (error) {
        toast.error("Could not unmask author: " + (error instanceof Error ? error.message : "Database error"));
      } else {
        toast.success("Author revealed and logged to audit trail");
        setRevealTarget(null);
        setRevealReason("");
        await fetchQueue();
      }
    } catch (err) {
      toast.error("Error revealing author");
      console.error(err);
    } finally {
      setRevealing(false);
    }
  };

  const handleStatusChange = async (
    item: ModerationQueueItem,
    newStatus: "new" | "contacted" | "resolved"
  ) => {
    setUpdatingId(item.id);
    const note = notesState[item.id] ?? item.admin_notes ?? "";
    const { success, error } = await updateModerationStatus(item.id, newStatus, note);
    setUpdatingId(null);

    if (error || !success) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Marked as ${newStatus}`);
      await fetchQueue();
    }
  };

  const handleSaveNotes = async (item: ModerationQueueItem) => {
    setUpdatingId(item.id);
    const note = notesState[item.id] ?? "";
    const { success, error } = await updateModerationStatus(item.id, item.status, note);
    setUpdatingId(null);

    if (error || !success) {
      toast.error("Failed to save notes");
    } else {
      toast.success("Notes saved");
      await fetchQueue();
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  const countNew = items.filter((i) => i.status === "new").length;
  const countContacted = items.filter((i) => i.status === "contacted").length;
  const countResolved = items.filter((i) => i.status === "resolved").length;

  return (
    <AdminPageWrapper>
      <AdminHeader
        title="Well-being Moderation"
        description="Review distress flags and peer concerns. Unmasking an anonymous author requires an audit-logged justification."
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh} isLoading={refreshing}>
            {!refreshing && <RefreshCw className="h-4 w-4 mr-1.5" />}
            Refresh
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            activeTab === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          )}
        >
          All ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            activeTab === "new"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          )}
        >
          New ({countNew})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("contacted")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            activeTab === "contacted"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          )}
        >
          Contacted ({countContacted})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resolved")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            activeTab === "resolved"
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-card text-muted-foreground border-border hover:bg-accent"
          )}
        >
          Resolved ({countResolved})
        </button>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-lg border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HeartPulse className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-foreground text-base">No flagged items</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {activeTab === "all"
                ? "There are currently no items in the well-being moderation queue."
                : `No items marked as "${activeTab}".`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const statusConfig = STATUS_VARIANTS[item.status];
            const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

            return (
              <Card key={item.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs font-medium", statusConfig.className)}>
                        {statusConfig.label}
                      </Badge>

                      <Badge variant="secondary" className="text-xs font-normal">
                        {item.content_type === "post" ? "Post" : "Comment"}
                      </Badge>

                      {item.source === "keyword" ? (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                          <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                          Keyword match: &quot;{item.matched_phrase}&quot;
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                          <HeartHandshake className="h-3 w-3 mr-1 text-rose-500" />
                          Peer report {item.reported_by_name ? `by ${item.reported_by_name}` : ""}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Flagged {timeAgo}</span>
                    </div>
                  </div>

                  <CardTitle className="text-base font-semibold mt-2">
                    {item.content_title || "Untitled content"}
                  </CardTitle>
                  <CardDescription className="text-sm text-foreground/90 whitespace-pre-line mt-1 bg-muted/40 p-3 rounded-md border border-border/60">
                    {item.content_snippet}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Author Identity Section */}
                  <div className="rounded-md border border-border bg-card p-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-xs text-muted-foreground mb-1">
                          Author Identity
                        </div>

                        {item.is_anonymous && !item.author_revealed ? (
                          <div className="flex items-center gap-2 text-foreground">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Anonymous student (Protected)</span>
                            <span className="text-xs text-muted-foreground">
                              Hidden from admins until explicitly unmasked.
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-foreground">
                              {item.is_anonymous ? (
                                <Unlock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-semibold">{item.author_name}</span>
                              {item.author_email && (
                                <span className="text-xs text-muted-foreground">({item.author_email})</span>
                              )}
                              {item.author_department && (
                                <Badge variant="secondary" className="text-3xs">
                                  {item.author_department}
                                </Badge>
                              )}
                            </div>

                            {item.author_revealed && (
                              <p className="text-xs text-muted-foreground">
                                Revealed by {item.author_revealed_by_name || "Admin"} on{" "}
                                {item.author_revealed_at ? new Date(item.author_revealed_at).toLocaleString() : ""}
                                {item.author_reveal_reason ? ` • Reason: "${item.author_reveal_reason}"` : ""}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Unmask Button for anonymous posts */}
                      {item.is_anonymous && !item.author_revealed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRevealTarget(item);
                            setRevealReason("");
                          }}
                          className="shrink-0 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                          <Unlock className="h-3.5 w-3.5 mr-1" />
                          Reveal Author (Audit Logged)
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Private Admin Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`notes-${item.id}`} className="text-xs text-muted-foreground">
                      Private Moderator Notes
                    </Label>
                    <div className="flex gap-2">
                      <Textarea
                        id={`notes-${item.id}`}
                        rows={2}
                        placeholder="Add notes about outreach, counsellor referral, or wellness check..."
                        value={notesState[item.id] ?? ""}
                        onChange={(e) =>
                          setNotesState((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="text-xs resize-none"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveNotes(item)}
                        disabled={updatingId === item.id}
                        className="shrink-0 self-end text-xs"
                      >
                        Save Note
                      </Button>
                    </div>
                  </div>

                  {/* Status Triage Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div className="text-xs text-muted-foreground">
                      {item.action_taken_at && (
                        <span>
                          Last action by {item.action_taken_by_name || "Admin"}{" "}
                          {formatDistanceToNow(new Date(item.action_taken_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.status !== "new" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(item, "new")}
                          disabled={updatingId === item.id}
                          className="text-xs h-8"
                        >
                          Reopen
                        </Button>
                      )}
                      {item.status !== "contacted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(item, "contacted")}
                          disabled={updatingId === item.id}
                          className="text-xs h-8 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        >
                          Mark Contacted
                        </Button>
                      )}
                      {item.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(item, "resolved")}
                          disabled={updatingId === item.id}
                          className="text-xs h-8 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reveal Author Confirmation Dialog */}
      <Dialog
        open={Boolean(revealTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRevealTarget(null);
            setRevealReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Reveal Anonymous Author
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs leading-relaxed pt-1">
              Anonymous posts are protected to preserve student trust and psychological safety. Unmasking an author is restricted to direct welfare interventions and will be permanently recorded in the admin audit log.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRevealSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reveal-reason" className="text-xs font-semibold text-foreground">
                Mandatory Reason for Unmasking *
              </Label>
              <Input
                id="reveal-reason"
                placeholder="e.g. Urgent wellness outreach with university counsellor"
                value={revealReason}
                onChange={(e) => setRevealReason(e.target.value)}
                required
                minLength={5}
                className="text-sm"
              />
              <p className="text-3xs text-muted-foreground">
                This reason, your admin account, and the current timestamp will be permanently written to admin_audit_log.
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevealTarget(null)}
                disabled={revealing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={revealing}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm &amp; Unmask
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageWrapper>
  );
}
