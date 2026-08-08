
import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Search, Cog, RefreshCw, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeTime } from "@/utils/date-utils";
import { cn } from "@/lib/utils";

// Shape of the jsonb returned by the admin_health_metrics() RPC
// (supabase/migrations/20260809150000_admin_health_metrics.sql). The RPC
// itself is admin-gated (42501 for anyone else) — this panel only decides
// how to *show* the numbers, not who gets to see them.
interface HealthMetrics {
  email_stuck_1h: number;
  email_errors_24h: number;
  embedding_backlog: number;
  chunks_total: number;
  rebuild_last_success: string | null;
  embed_last_success: string | null;
  cron_failures_24h: number;
  generated_at: string;
}

type Status = "green" | "amber" | "red";

const HOUR_MS = 60 * 60 * 1000;

function emailStatus(m: HealthMetrics): Status {
  if (m.email_stuck_1h > 0) return "red";
  if (m.email_errors_24h > 0) return "amber";
  return "green";
}

function searchStatus(m: HealthMetrics): Status {
  if (m.embedding_backlog > 25) return "red";
  if (m.embedding_backlog >= 1) return "amber";
  return "green";
}

function jobsStatus(m: HealthMetrics): Status {
  const rebuildAgeMs = m.rebuild_last_success
    ? Date.now() - new Date(m.rebuild_last_success).getTime()
    : Infinity;
  const embedAgeMs = m.embed_last_success
    ? Date.now() - new Date(m.embed_last_success).getTime()
    : Infinity;

  // Rebuild missing entirely or stale past 6h, or the cron log shows
  // repeated failures: treat as red regardless of the other two.
  if (rebuildAgeMs > 6 * HOUR_MS || m.cron_failures_24h > 3) return "red";

  const rebuildFresh = rebuildAgeMs <= 2 * HOUR_MS;
  const embedFresh = embedAgeMs <= 0.5 * HOUR_MS;
  if (rebuildFresh && embedFresh && m.cron_failures_24h === 0) return "green";

  return "amber";
}

const STATUS_DOT: Record<Status, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-destructive",
};

const STATUS_TEXT: Record<Status, string> = {
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-destructive",
};

const STATUS_LABEL: Record<Status, string> = {
  green: "Healthy",
  amber: "Needs attention",
  red: "Action needed",
};

interface HealthTileData {
  key: string;
  icon: LucideIcon;
  title: string;
  status: Status;
  stats: { label: string; value: string }[];
  message: string | null;
}

const HealthTile = ({ icon: Icon, title, status, stats, message }: HealthTileData) => (
  <Card className="relative overflow-hidden min-w-0">
    <span
      aria-hidden="true"
      className={cn("absolute inset-y-0 left-0 w-1.5", STATUS_DOT[status])}
    />
    <CardContent className="p-4 pl-5">
      {/* flex-wrap rather than truncating the title: the status pill
          ("Needs attention" / "Action needed") is wide enough at 360px that
          forcing both onto one row clipped tile names like "Background
          jobs" down to "Backgrou...". Wrapping the pill onto its own line
          keeps the title readable and still reads fine on desktop where
          there's room for one row. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", STATUS_TEXT[status])}>
          <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <dl className="mt-3 space-y-1">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-sm">
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="tabular-nums font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>

      {message && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{message}</p>
      )}
    </CardContent>
  </Card>
);

const PlatformHealthPanel = () => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchMetrics = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_health_metrics");
      // 42501 (not an admin) lands here as an error, same as any other
      // failure — the panel never distinguishes "you can't see this" from
      // "this broke", it just goes quiet either way.
      if (rpcError) throw rpcError;
      setMetrics((data ?? null) as unknown as HealthMetrics | null);
      setError(false);
    } catch (err) {
      console.error("Error loading platform health metrics:", err);
      setMetrics(null);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  const tiles = useMemo<HealthTileData[]>(() => {
    if (!metrics) return [];

    const eStatus = emailStatus(metrics);
    const sStatus = searchStatus(metrics);
    const jStatus = jobsStatus(metrics);

    return [
      {
        key: "email",
        icon: Mail,
        title: "Email queue",
        status: eStatus,
        stats: [
          { label: "Stuck 1h+", value: String(metrics.email_stuck_1h) },
          { label: "Errors (24h)", value: String(metrics.email_errors_24h) },
        ],
        message:
          eStatus === "red"
            ? "Emails are waiting longer than an hour to send — check the email dashboard's dead-letter view."
            : eStatus === "amber"
              ? "Some emails failed to send in the last day — check the email dashboard's dead-letter view."
              : null,
      },
      {
        key: "search",
        icon: Search,
        title: "Search index",
        status: sStatus,
        stats: [
          { label: "Backlog", value: String(metrics.embedding_backlog) },
          { label: "Total chunks", value: String(metrics.chunks_total) },
        ],
        message:
          sStatus === "red"
            ? "The search index has fallen well behind — new content won't show up in search yet. It needs a rebuild."
            : sStatus === "amber"
              ? "The search index has a small backlog — it should catch up on its own. Check back if it keeps growing."
              : null,
      },
      {
        key: "jobs",
        icon: Cog,
        title: "Background jobs",
        status: jStatus,
        stats: [
          {
            label: "Rebuild",
            value: metrics.rebuild_last_success ? formatRelativeTime(metrics.rebuild_last_success) : "Never",
          },
          {
            label: "Embed",
            value: metrics.embed_last_success ? formatRelativeTime(metrics.embed_last_success) : "Never",
          },
          { label: "Failures (24h)", value: String(metrics.cron_failures_24h) },
        ],
        message:
          jStatus === "red"
            ? "A background job hasn't completed in a while or keeps failing — content may be going stale. Check the job logs."
            : jStatus === "amber"
              ? "A background job is running a bit behind — nothing to do yet, just keep an eye on it."
              : null,
      },
    ];
  }, [metrics]);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Platform health</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fetchMetrics(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-28 animate-pulse" />
          ))}
        </div>
      ) : error || !metrics ? (
        <p className="text-sm text-muted-foreground">Health data unavailable</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map(({ key, ...tile }) => (
            <HealthTile key={key} {...tile} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PlatformHealthPanel;
