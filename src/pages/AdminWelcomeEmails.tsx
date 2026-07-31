import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Mail, RefreshCw, Search } from "lucide-react";

import AdminLayout from "@/components/admin/AdminLayout";
import WelcomeEmailButton from "@/components/admin/verification/WelcomeEmailButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMentorWelcomeStatus,
  type MentorWelcomeStatus,
} from "@/integrations/supabase/services/welcome-emails";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";

type Tab = "waiting" | "sent" | "all";

/**
 * One place to see who has been welcomed and who is still owed one.
 *
 * It exists because approval is automatic. Nothing pauses on an admin's desk,
 * so there is no natural moment at which sending the welcome is the obvious
 * next click — and the verification screen's approved tab is every mentor who
 * ever joined, which answers "who applied" rather than "who is waiting".
 *
 * "Sent" throughout this page means an admin confirmed it. The mail leaves
 * through their own client and the browser cannot observe delivery; see
 * WelcomeEmailButton.
 */
const AdminWelcomeEmails = () => {
  const [rows, setRows] = useState<MentorWelcomeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { rows: next, error } = await listMentorWelcomeStatus();
    setRows(next);
    setLoadError(error?.message ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const waiting = rows.filter((row) => !row.welcomed);
  const sent = rows.filter((row) => row.welcomed);

  const visible = useMemo(() => {
    const base = tab === "waiting" ? waiting : tab === "sent" ? sent : rows;
    const term = search.trim().toLowerCase();
    if (!term) return base;

    return base.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        (row.email ?? "").toLowerCase().includes(term) ||
        (row.department ?? "").toLowerCase().includes(term),
    );
  }, [tab, rows, waiting, sent, search]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "waiting", label: "Waiting", count: waiting.length },
    { id: "sent", label: "Sent", count: sent.length },
    { id: "all", label: "All mentors", count: rows.length },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome emails</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              New mentors are approved automatically, so nobody is prompted to welcome them. This is
              the list of who still needs one.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* The tracking RPCs ship in a migration that is applied by hand, so
            this page can exist before its backend does. Saying so beats an
            empty list that reads as "no mentors". */}
        {loadError && (
          <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Welcome tracking isn't set up yet
                </p>
                <p className="mt-1 text-amber-800 dark:text-amber-300">
                  Run the migration{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
                    20260731150000_welcome_email_tracking.sql
                  </code>{" "}
                  in the Supabase SQL editor, then refresh this page.
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{loadError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !loadError && waiting.length === 0 && rows.length > 0 && (
          <Card className="border-green-500/40 bg-green-50 dark:bg-green-950/30">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-900 dark:text-green-200">
                Everyone's been welcomed. Nothing waiting.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((entry) => (
              <Button
                key={entry.id}
                size="sm"
                variant={tab === entry.id ? "default" : "outline"}
                onClick={() => setTab(entry.id)}
                className="gap-1.5"
              >
                {entry.label}
                <Badge variant="secondary" className="h-5 px-1.5 tabular-nums">
                  {entry.count}
                </Badge>
              </Button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email"
              className="pl-9"
              aria-label="Search mentors"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <Mail className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                {search.trim()
                  ? "Nobody matches that"
                  : tab === "waiting"
                    ? "Nobody waiting"
                    : "Nothing here yet"}
              </p>
              {!search.trim() && tab !== "waiting" && (
                <p className="max-w-sm text-sm text-muted-foreground">
                  Approved mentors appear here as they join.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visible.map((row) => (
              <Card key={row.userId}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={row.profileImage ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{getInitials(row.name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/mentor/${row.userId}`}
                        className="font-medium hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      {row.welcomed ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Welcomed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Waiting
                        </Badge>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {row.email ?? "No email on file"}
                      {row.department ? ` · ${row.department}` : ""}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.welcomed && row.sentAt
                        ? `Welcomed ${new Date(row.sentAt).toLocaleDateString()}`
                        : row.approvedAt
                          ? `Joined ${new Date(row.approvedAt).toLocaleDateString()}`
                          : null}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <WelcomeEmailButton
                      mentorId={row.userId}
                      mentorName={row.name}
                      mentorEmail={row.email}
                      sentAt={row.sentAt}
                      onMarkedSent={load}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWelcomeEmails;
