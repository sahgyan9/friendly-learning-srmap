import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Clock, Globe, MonitorSmartphone, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface ErrorReport {
  id: string;
  user_id: string | null;
  message: string;
  route: string | null;
  user_agent: string | null;
  status: "new" | "reviewed" | "resolved";
  admin_notes: string | null;
  created_at: string;
}

const STATUS_COLOR: Record<ErrorReport["status"], string> = {
  new: "bg-destructive",
  reviewed: "bg-amber-500",
  resolved: "bg-green-600",
};

const AdminErrorReports = () => {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ErrorReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // error_reports isn't in the generated Supabase types yet -- see reportError.ts.
      const { data, error } = await supabase
        .from("error_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching error reports:", error);
        toast.error("Failed to load error reports");
        return;
      }

      setReports((data ?? []) as ErrorReport[]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ErrorReport["status"], notes?: string) => {
    setUpdating(true);
    try {
      const updatePayload: { status: ErrorReport["status"]; admin_notes?: string } = { status };
      if (notes !== undefined) updatePayload.admin_notes = notes;

      const { error } = await supabase
        .from("error_reports")
        .update(updatePayload)
        .eq("id", id);

      if (error) {
        console.error("Error updating report:", error);
        toast.error("Failed to update report");
        return;
      }

      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, admin_notes: notes ?? r.admin_notes } : r)),
      );
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status, admin_notes: notes ?? prev.admin_notes } : prev));
      toast.success("Report updated");
    } finally {
      setUpdating(false);
    }
  };

  const handleSelect = (report: ErrorReport) => {
    setSelected(report);
    setAdminNotes(report.admin_notes || "");
    if (report.status === "new") {
      updateStatus(report.id, "reviewed");
    }
  };

  const newCount = reports.filter((r) => r.status === "new").length;
  const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <AdminPageWrapper loading={loading}>
      <AdminHeader
        title="Error reports"
        description="Errors students flagged with the 'Report' button on a toast."
      />

      <div className="space-y-6">
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {([
            ["new", "New", newCount],
            ["reviewed", "Reviewed", reviewedCount],
            ["resolved", "Resolved", resolvedCount],
          ] as const).map(([key, label, count]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[key]}`} aria-hidden />
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="tabular font-medium text-foreground">{count}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No error reports</p>
                  <p className="mt-1 text-sm text-muted-foreground">Reports appear here when a student taps Report on an error toast.</p>
                </CardContent>
              </Card>
            ) : (
              reports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-colors duration-150 ${selected?.id === report.id ? "border-primary bg-primary/5" : "hover:border-foreground/20"
                    }`}
                  onClick={() => handleSelect(report)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{report.message}</span>
                      </CardTitle>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium capitalize text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[report.status]}`} aria-hidden />
                        {report.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Globe className="h-3 w-3" />
                      {report.route ?? "unknown route"}
                      <span className="mx-1">·</span>
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                    </p>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>

          <div className="sticky top-6">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Report Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Message:</label>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{selected.message}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> Route:
                    </label>
                    <p className="text-sm">{selected.route ?? "unknown"}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> Reported by:
                    </label>
                    <p className="text-sm">{selected.user_id ? selected.user_id : "Signed-out visitor"}</p>
                  </div>

                  {selected.user_agent && (
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1">
                        <MonitorSmartphone className="h-3.5 w-3.5" /> Browser:
                      </label>
                      <p className="text-sm text-muted-foreground break-all">{selected.user_agent}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">
                      Reported {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                    </label>
                  </div>

                  <Separator />

                  <div>
                    <label htmlFor="admin-notes" className="text-sm font-medium block mb-2">
                      Admin Notes:
                    </label>
                    <Textarea
                      id="admin-notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="What's the fix / status of this issue..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => updateStatus(selected.id, "reviewed", adminNotes)}
                      disabled={updating}
                      variant="outline"
                      size="sm"
                    >
                      Mark Reviewed
                    </Button>
                    <Button
                      onClick={() => updateStatus(selected.id, "resolved", adminNotes)}
                      disabled={updating}
                      variant="outline"
                      size="sm"
                    >
                      Mark Resolved
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a report to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
};

export default AdminErrorReports;
