import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { deleteNotice, updateNotice, CampusNotice } from "@/integrations/supabase/services/notices";
import { getErrorMessage } from "@/lib/errors";
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

interface NoticeListProps {
  notices: CampusNotice[];
  loading: boolean;
  onRefetch: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  holiday_change: "Holiday Change",
  academic_calendar: "Academic Calendar",
  exam: "Exam",
  event: "Event",
  administrative: "Administrative",
  general: "General",
};

const NoticeList = ({ notices, loading, onRefetch }: NoticeListProps) => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      await deleteNotice(id);
      onRefetch();
      toast.success("Notice deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete notice"));
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublished = async (notice: CampusNotice) => {
    try {
      setToggling(notice.id);
      await updateNotice(notice.id, { is_published: !notice.is_published });
      onRefetch();
      toast.success(notice.is_published ? "Notice unpublished" : "Notice published");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update notice"));
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (notices.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No notices yet. Add the first one above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Notices ({notices.length})</h2>
      {notices.map((notice) => (
        <Card key={notice.id} className={notice.is_published ? "" : "opacity-60"}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{notice.title}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{CATEGORY_LABELS[notice.category] ?? notice.category}</Badge>
                  <span>Issued {notice.issued_date}</span>
                  {notice.effective_date && <span>· Effective {notice.effective_date}</span>}
                  {notice.reference_no && <span>· {notice.reference_no}</span>}
                  {!notice.is_published && <Badge variant="outline">Unpublished</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTogglePublished(notice)}
                  disabled={toggling === notice.id}
                  title={notice.is_published ? "Unpublish" : "Publish"}
                >
                  {notice.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Notice</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{notice.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(notice.id)}
                        disabled={deleting === notice.id}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting === notice.id ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {notice.summary && <p className="text-sm text-muted-foreground">{notice.summary}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NoticeList;
