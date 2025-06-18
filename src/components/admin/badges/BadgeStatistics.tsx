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
        const stats = await getBadgeStatistics();
        setStats(stats);
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
      title: "Total Badges Awarded",
      value: stats?.totalBadges || 0,
      icon: Award,
      color: "text-blue-600",
    },
    {
      title: "Performance Badges",
      value: stats?.categoryStats.performance || 0,
      icon: Star,
      color: "text-yellow-600",
    },
    {
      title: "Expertise Badges",
      value: stats?.categoryStats.expertise || 0,
      icon: Trophy,
      color: "text-emerald-600",
    },
    {
      title: "Contribution Badges",
      value: stats?.categoryStats.contribution || 0,
      icon: Users,
      color: "text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BadgeStatistics;
