import React, { useEffect, useState } from "react";
import {
  ExternalLink,
  FileCode,
  FileText,
  FolderGit2,
  HardDrive,
  Link2,
  Plus,
  Trash2,
  Video,
  Pin,
  Loader2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addCommunityResource,
  deleteCommunityResource,
  detectResourceKind,
  getCommunityResources,
  type CommunityResource,
  type ResourceKind,
} from "@/integrations/supabase/services/community-resources";
import { formatRelativeTime } from "@/utils/date-utils";
import { cn } from "@/lib/utils";

interface CommunityResourcesTabProps {
  communityId: string;
  communityName: string;
  communityKind: string;
  isMember: boolean;
  isOwner: boolean;
  viewerName?: string;
}

const KIND_META: Record<
  ResourceKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  drive: {
    label: "Google Drive / Docs",
    icon: HardDrive,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  github: {
    label: "GitHub / Repo",
    icon: FolderGit2,
    color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
  document: {
    label: "Document / PDF",
    icon: FileText,
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  },
  notes: {
    label: "Notes & Roadmap",
    icon: BookOpen,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  video: {
    label: "Video Recording",
    icon: Video,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  link: {
    label: "Web Link",
    icon: Link2,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
};

export function CommunityResourcesTab({
  communityId,
  communityName,
  communityKind,
  isMember,
  isOwner,
  viewerName = "A student",
}: CommunityResourcesTabProps) {
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<ResourceKind>("link");
  const [description, setDescription] = useState("");

  const canShare = isMember || isOwner;

  const load = async () => {
    setLoading(true);
    const data = await getCommunityResources(communityId, communityName, communityKind);
    setResources(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [communityId, communityName, communityKind]);

  // Auto-detect resource kind when typing URL
  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.startsWith("http")) {
      setKind(detectResourceKind(value));
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error("Please enter a title and a valid URL");
      return;
    }

    setSubmitting(true);
    try {
      const created = await addCommunityResource(communityId, {
        title: title.trim(),
        url: url.trim(),
        kind,
        description: description.trim() || undefined,
        addedByName: viewerName,
        isPinned: isOwner,
      });

      setResources((prev) => [created, ...prev]);
      toast.success("Resource shared with the workspace");
      setTitle("");
      setUrl("");
      setDescription("");
      setKind("link");
      setModalOpen(false);
    } catch (err) {
      toast.error("Could not share resource");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (resourceId: string, resourceTitle: string) => {
    const ok = await deleteCommunityResource(communityId, resourceId);
    if (ok) {
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      toast.success(`Removed "${resourceTitle}"`);
    } else {
      toast.error("Could not remove resource");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card p-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Workspace Resources & Materials</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shared GitHub repos, Google Drive folders, study notes, and syllabus links for #{communityName}.
          </p>
        </div>

        {canShare && (
          <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            Share a resource
          </Button>
        )}
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : resources.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((res) => {
            const meta = KIND_META[res.kind] || KIND_META.link;
            const Icon = meta.icon;

            return (
              <div
                key={res.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", meta.color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {meta.label}
                      </span>
                    </div>

                    {res.isPinned && (
                      <Badge variant="outline" className="gap-1 text-[10px] font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                        <Pin className="h-2.5 w-2.5 fill-current" />
                        Pinned
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {res.title}
                  </h3>

                  {res.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {res.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span className="truncate">
                    Added by <strong className="font-medium text-foreground">{res.addedByName}</strong> · {formatRelativeTime(res.createdAt)}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDelete(res.id, res.title)}
                        title="Remove resource"
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-border/80 bg-card/60">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FolderGit2 className="h-6 w-6" />
            </span>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold">No resources shared yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {canShare
                  ? "Share Google Drive links, GitHub repositories, lecture notes, and useful materials with group members."
                  : "Join this group to access and share resources."}
              </p>
            </div>
            {canShare && (
              <Button onClick={() => setModalOpen(true)} size="sm" className="mt-2 gap-1.5">
                <Plus className="h-4 w-4" />
                Share the first resource
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Resource Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share a Resource</DialogTitle>
            <DialogDescription>
              Add a link, repository, or document for everyone in #{communityName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddResource} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="res-title">Resource Title</Label>
              <Input
                id="res-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. End-Sem Midterm Revision Slides"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-url">URL / Link</Label>
              <Input
                id="res-url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://drive.google.com/... or https://github.com/..."
                type="url"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Resource Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(KIND_META) as ResourceKind[]).map((k) => {
                  const meta = KIND_META[k];
                  const Icon = meta.icon;
                  const active = kind === k;

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-all text-left",
                        active
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{meta.label.split("/")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="res-desc">Description (Optional)</Label>
              <Textarea
                id="res-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this file or repo contains..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1.5">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Share with group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CommunityResourcesTab;
