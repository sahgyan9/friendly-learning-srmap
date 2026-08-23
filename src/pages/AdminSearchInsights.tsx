import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ExternalLink,
  MousePointerClick,
  RefreshCw,
  Search,
  SearchX,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import AdminPageWrapper from "@/components/admin/AdminPageWrapper";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * What students looked for, and where the search let them down.
 *
 * The two lists that matter are the failures, not the top-ten. A query that
 * returned nothing is a student telling you what the site does not have; a
 * query that returned plenty and got no click is search returning the wrong
 * things confidently, which is worse and much harder to notice.
 *
 * Everything here is aggregate. search_analytics has no viewer column, so
 * there is nothing on this page that can be traced back to a person.
 */

type SearchAnalyticsRow = {
  query_hash: string;
  query_text: string;
  search_count: number;
  zero_result_count: number;
  click_count: number;
  first_searched_at: string;
  last_searched_at: string;
};

/** A query needs to have been tried a few times before "nobody clicked" means anything. */
const MIN_SEARCHES_FOR_NO_CLICK = 2;

export default function AdminSearchInsights() {
  const [rows, setRows] = useState<SearchAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("search_analytics" as never)
        .select("query_hash, query_text, search_count, zero_result_count, click_count, first_searched_at, last_searched_at")
        .order("last_searched_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setRows((data as unknown as SearchAnalyticsRow[]) ?? []);
    } catch (error) {
      console.error("Failed to load search analytics:", error);
      toast.error("Could not load search analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const matching = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.query_text.toLowerCase().includes(needle));
  }, [rows, filter]);

  const zeroResult = useMemo(
    () =>
      [...matching]
        .filter((row) => row.zero_result_count > 0)
        .sort((a, b) => b.zero_result_count - a.zero_result_count),
    [matching],
  );

  const noClick = useMemo(
    () =>
      [...matching]
        .filter(
          (row) =>
            row.click_count === 0
            && row.search_count >= MIN_SEARCHES_FOR_NO_CLICK
            // A search that found nothing had nothing to click; that is the
            // other list's problem, not this one's.
            && row.zero_result_count < row.search_count,
        )
        .sort((a, b) => b.search_count - a.search_count),
    [matching],
  );

  const topSearches = useMemo(
    () => [...matching].sort((a, b) => b.search_count - a.search_count),
    [matching],
  );

  const totalSearches = rows.reduce((sum, row) => sum + row.search_count, 0);

  return (
    <AdminPageWrapper>
      <AdminHeader
        title="Search Insights"
        description="What students searched for, and where search failed them."
        action={
          <Button variant="outline" onClick={() => void fetchData()} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <SummaryCard
          icon={Search}
          label="Searches run"
          value={totalSearches}
          hint={`${rows.length} distinct queries`}
          tone="text-blue-600 dark:text-blue-400"
        />
        <SummaryCard
          icon={SearchX}
          label="Found nothing"
          value={zeroResult.length}
          hint="Queries that returned no results"
          tone="text-rose-600 dark:text-rose-400"
        />
        <SummaryCard
          icon={MousePointerClick}
          label="Nothing clicked"
          value={noClick.length}
          hint="Had results, but none were opened"
          tone="text-amber-600 dark:text-amber-400"
        />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Queries</CardTitle>
              <CardDescription>
                Aggregate counts only — no student is identified here.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter queries…"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="zero">
            <TabsList className="mb-4">
              <TabsTrigger value="zero" className="gap-1.5">
                <SearchX className="h-3.5 w-3.5" />
                Found nothing
                <Badge variant="secondary" className="ml-1 tabular-nums">{zeroResult.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="noclick" className="gap-1.5">
                <MousePointerClick className="h-3.5 w-3.5" />
                Nothing clicked
                <Badge variant="secondary" className="ml-1 tabular-nums">{noClick.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="top" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Most searched
                <Badge variant="secondary" className="ml-1 tabular-nums">{topSearches.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="zero">
              <QueryTable
                rows={zeroResult}
                loading={loading}
                emptyTitle="No dead ends"
                emptyBody="Every search so far returned something. This list fills up as students search for things the site does not cover yet — it is the clearest signal of what to add next."
                highlight="zero"
              />
            </TabsContent>

            <TabsContent value="noclick">
              <QueryTable
                rows={noClick}
                loading={loading}
                emptyTitle="Nothing stranded here"
                emptyBody={`Every repeated search got a click. Queries appear here after being searched ${MIN_SEARCHES_FOR_NO_CLICK}+ times with results shown and none opened — usually a ranking problem, not a content gap.`}
                highlight="noclick"
              />
            </TabsContent>

            <TabsContent value="top">
              <QueryTable
                rows={topSearches}
                loading={loading}
                emptyTitle="No searches recorded yet"
                emptyBody="Counts start accumulating as students use the search box."
                highlight="none"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminPageWrapper>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Search;
  label: string;
  value: number;
  hint: string;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${tone}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function QueryTable({
  rows,
  loading,
  emptyTitle,
  emptyBody,
  highlight,
}: {
  rows: SearchAnalyticsRow[];
  loading: boolean;
  emptyTitle: string;
  emptyBody: string;
  highlight: "zero" | "noclick" | "none";
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center mb-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Query</TableHead>
            <TableHead className="text-right w-24">Searches</TableHead>
            {highlight === "zero" && <TableHead className="text-right w-28">Empty</TableHead>}
            {highlight !== "zero" && <TableHead className="text-right w-24">Clicks</TableHead>}
            <TableHead className="text-right w-32">Last searched</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.query_hash}>
              <TableCell className="font-medium max-w-md truncate">{row.query_text}</TableCell>
              <TableCell className="text-right tabular-nums">{row.search_count}</TableCell>
              {highlight === "zero" && (
                <TableCell className="text-right tabular-nums">
                  <Badge variant="destructive">{row.zero_result_count}</Badge>
                </TableCell>
              )}
              {highlight !== "zero" && (
                <TableCell className="text-right tabular-nums">
                  {row.click_count === 0 ? (
                    <Badge variant="secondary">0</Badge>
                  ) : (
                    row.click_count
                  )}
                </TableCell>
              )}
              <TableCell className="text-right text-muted-foreground text-xs whitespace-nowrap">
                {formatDistanceToNow(new Date(row.last_searched_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {/* Run it yourself — the fastest way to see why it failed. */}
                <Link
                  to={`/search?q=${encodeURIComponent(row.query_text)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Run this search"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
