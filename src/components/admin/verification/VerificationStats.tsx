
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, XCircle, Users, TrendingUp } from "lucide-react";

interface VerificationStatsProps {
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } | null;
}

const VerificationStats = ({ stats }: VerificationStatsProps) => {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const approvalRate = stats.total > 0 ? (stats.approved / (stats.approved + stats.rejected)) * 100 : 0;
  const processingRate = stats.total > 0 ? ((stats.approved + stats.rejected) / stats.total) * 100 : 0;

  const statCards = [
    {
      title: "Applications",
      value: stats.total,
      icon: Users,
      dot: "bg-muted-foreground",
      description: "All mentor applications",
    },
    {
      title: "Pending review",
      value: stats.pending,
      icon: Clock,
      dot: "bg-amber-500",
      description: "Awaiting admin decision",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      dot: "bg-green-600",
      description: "Verified",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      dot: "bg-destructive",
      description: "Did not meet the criteria",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${stat.dot}`} aria-hidden />
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Insights */}
      {stats.total > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Approval rate */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approval rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-semibold tabular">
                  {approvalRate.toFixed(1)}%
                </div>
                <Progress
                  value={approvalRate}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {stats.approved} approved out of {stats.approved + stats.rejected} processed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Processed */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Processed
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-semibold tabular">
                  {processingRate.toFixed(1)}%
                </div>
                <Progress
                  value={processingRate}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {stats.approved + stats.rejected} processed out of {stats.total} total
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions Summary */}
      {stats.pending > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-semibold text-foreground">
                  {stats.pending} application{stats.pending !== 1 ? 's' : ''} pending review
                </h3>
                <p className="text-sm text-muted-foreground">
                  Waiting for an approve or reject decision.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VerificationStats;
