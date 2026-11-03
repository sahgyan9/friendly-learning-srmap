import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Star, Users, Trophy } from "lucide-react";
import { getBadgeStatistics } from "@/integrations/supabase/services/badges";

interface BadgeStats {
  totalBadges: number;
  categoryStats: {
    [key: string]: number;
  };
}

const BadgeStatistics = () => {
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getBadgeStatistics();
        setStats(result.data);
      } catch (error) {
        console.error("Error fetching badge statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Badges awarded",
      value: stats?.totalBadges || 0,
      icon: Award,
    },
    {
      title: "Performance",
      value: stats?.categoryStats.performance || 0,
      icon: Star,
    },
    {
      title: "Expertise",
      value: stats?.categoryStats.expertise || 0,
      icon: Trophy,
    },
    {
      title: "Contribution",
      value: stats?.categoryStats.contribution || 0,
      icon: Users,
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BadgeStatistics;
