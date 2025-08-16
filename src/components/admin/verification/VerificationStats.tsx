
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
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
      title: "Total Applications",
      value: stats.total,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      description: "All mentor applications",
    },
    {
      title: "Pending Review",
      value: stats.pending,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      description: "Awaiting admin decision",
    },
    {
      title: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      description: "Successfully verified",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      description: "Did not meet criteria",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <div className={`absolute inset-0 ${stat.bgColor} opacity-5`}></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
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
          {/* Approval Rate */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approval Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-green-600">
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

          {/* Processing Progress */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Processing Progress
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-blue-600">
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
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {stats.pending} application{stats.pending !== 1 ? 's' : ''} pending review
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  These applications are waiting for your review and approval decision.
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
