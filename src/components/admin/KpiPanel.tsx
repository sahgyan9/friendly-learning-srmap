import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Search,
  MessageCircle,
  UsersIcon,
  MessageSquare,
  Megaphone,
  Smartphone,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Shape of the jsonb returned by admin_kpi_metrics()
// (supabase/migrations/20260827100000_pwa_installs_tracking.sql). The RPC is
// admin-gated (42501 for anyone else) — this panel only decides how to show
// the numbers, same split as PlatformHealthPanel.
interface KpiMetrics {
  signups_total: number;
  signups_7d: number;
  signups_30d: number;
  searches_total: number;
  unique_queries_total: number;
  queries_active_7d: number;
  zero_result_rate_pct: number;
  mentor_contacts_total: number;
  mentor_contacts_7d: number;
  distinct_mentors_contacted: number;
  group_joins_total: number;
  group_joins_7d: number;
  active_groups: number;
  posts_total: number;
  posts_7d: number;
  notices_published_total: number;
  notices_published_7d: number;
  pwa_installs_total?: number;
  pwa_installs_7d?: number;
  pwa_active_7d?: number;
  generated_at: string;
}

interface KpiTileData {
  key: string;
  icon: LucideIcon;
  title: string;
  stats: { label: string; value: string }[];
}

const KpiTile = ({ icon: Icon, title, stats }: KpiTileData) => (
  <Card className="min-w-0">
    <CardContent className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <dl className="mt-3 space-y-1">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-sm">
            <dt className="text-muted-foreground">{s.label}</dt>
            <dd className="tabular-nums font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>
    </CardContent>
  </Card>
);

const KpiPanel = () => {
  const [metrics, setMetrics] = useState<KpiMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchMetrics = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)("admin_kpi_metrics");
      if (rpcError) throw rpcError;
      setMetrics((data ?? null) as unknown as KpiMetrics | null);
      setError(false);
    } catch (err) {
      console.error("Error loading KPI metrics:", err);
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

  const tiles: KpiTileData[] = metrics
    ? [
        {
          key: "signups",
          icon: UserPlus,
          title: "Signups",
          stats: [
            { label: "Total", value: String(metrics.signups_total ?? 0) },
            { label: "Last 7 days", value: String(metrics.signups_7d ?? 0) },
            { label: "Last 30 days", value: String(metrics.signups_30d ?? 0) },
          ],
        },
        {
          key: "pwa_installs",
          icon: Smartphone,
          title: "App Installs",
          stats: [
            { label: "Total installed", value: String(metrics.pwa_installs_total ?? 0) },
            { label: "Last 7 days", value: String(metrics.pwa_installs_7d ?? 0) },
            { label: "Active app users (7d)", value: String(metrics.pwa_active_7d ?? 0) },
          ],
        },
        {
          key: "searches",
          icon: Search,
          title: "Search",
          stats: [
            { label: "Total searches", value: String(metrics.searches_total ?? 0) },
            { label: "Active queries (7d)", value: String(metrics.queries_active_7d ?? 0) },
            { label: "Zero-result rate", value: `${metrics.zero_result_rate_pct ?? 0}%` },
          ],
        },
        {
          key: "mentors",
          icon: MessageCircle,
          title: "Mentor contacts",
          stats: [
            { label: "Total contacts", value: String(metrics.mentor_contacts_total ?? 0) },
            { label: "Last 7 days", value: String(metrics.mentor_contacts_7d ?? 0) },
            { label: "Distinct mentors reached", value: String(metrics.distinct_mentors_contacted ?? 0) },
          ],
        },
        {
          key: "groups",
          icon: UsersIcon,
          title: "Groups",
          stats: [
            { label: "Active groups", value: String(metrics.active_groups ?? 0) },
            { label: "Total joins", value: String(metrics.group_joins_total ?? 0) },
            { label: "Joins (7d)", value: String(metrics.group_joins_7d ?? 0) },
          ],
        },
        {
          key: "posts",
          icon: MessageSquare,
          title: "Community posts",
          stats: [
            { label: "Total posts", value: String(metrics.posts_total ?? 0) },
            { label: "Last 7 days", value: String(metrics.posts_7d ?? 0) },
          ],
        },
        {
          key: "notices",
          icon: Megaphone,
          title: "Notices",
          stats: [
            { label: "Published", value: String(metrics.notices_published_total ?? 0) },
            { label: "Last 7 days", value: String(metrics.notices_published_7d ?? 0) },
          ],
        },
      ]
    : [];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Launch KPIs</h2>
          <p className="text-xs text-muted-foreground">
            Real-time database metrics across signups, app installs, search, and interactions.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => fetchMetrics(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-28 animate-pulse" />
          ))}
        </div>
      ) : error || !metrics ? (
        <p className="text-sm text-muted-foreground">KPI data unavailable</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tiles.map(({ key, ...tile }) => (
            <KpiTile key={key} {...tile} />
          ))}
        </div>
      )}
    </section>
  );
};

export default KpiPanel;
