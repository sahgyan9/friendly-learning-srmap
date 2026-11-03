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
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

// Resource types are told apart by icon and label; colour stays neutral
// because it would not mean anything here.
const NEUTRAL_KIND = "bg-secondary text-secondary-foreground";

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
    color: NEUTRAL_KIND,
  },
  document: {
    label: "Document / PDF",
    icon: FileText,
    color: NEUTRAL_KIND,
  },
  notes: {
    label: "Notes & Roadmap",
    icon: BookOpen,
    color: NEUTRAL_KIND,
  },
  video: {
    label: "Video Recording",
    icon: Video,
    color: NEUTRAL_KIND,
  },
  link: {
    label: "Web Link",
    icon: Link2,
    color: NEUTRAL_KIND,
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
      toast.error("Add a title and a valid URL");
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
      toast.success("Resource shared with the group");
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Resources</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Repos, Drive folders, notes and syllabus links shared in {communityName}.
          </p>
        </div>

        {canShare && (
          <Button onClick={() => setModalOpen(true)} size="sm" className="shrink-0">
            <Plus className="h-4 w-4" />
            Share a resource
          </Button>
        )}
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 w-full rounded-lg bg-muted animate-pulse" />
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
                className="relative flex min-w-0 flex-col justify-between rounded-lg border bg-card p-4 shadow-card"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", meta.color)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {meta.label}
                      </span>
                    </div>

                    {res.isPinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Pin className="h-3 w-3 fill-current" />
                        Pinned
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {res.title}
                  </h3>

                  {res.description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {res.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">
                    Added by <strong className="font-medium text-foreground">{res.addedByName}</strong> · {formatRelativeTime(res.createdAt)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    {isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Remove ${res.title}`}
                            title="Remove resource"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this resource?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{res.title}" will be removed for everyone in the group. The link itself is not affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(res.id, res.title)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 font-medium text-primary transition-colors duration-150 hover:bg-accent"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <FolderGit2 className="h-5 w-5" />
            </span>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-semibold">No resources shared yet</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {canShare
                  ? "Share Drive links, GitHub repositories and lecture notes with the group."
                  : "Join this group to see and share resources."}
              </p>
            </div>
            {canShare && (
              <Button onClick={() => setModalOpen(true)} size="sm" className="mt-2">
                <Plus className="h-4 w-4" />
                Share a resource
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Resource Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share a resource</DialogTitle>
            <DialogDescription>
              Add a link, repository or document for everyone in {communityName}.
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
              <Button type="submit" isLoading={submitting}>
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
