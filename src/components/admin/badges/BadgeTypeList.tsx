
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Award } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { deleteBadgeType, autoAwardPerformanceBadges } from "@/integrations/supabase/services/badges";
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

interface BadgeTypeListProps {
  badgeTypes: any[];
  loading: boolean;
  onRefetch: () => void;
}

const BadgeTypeList = ({ badgeTypes, loading, onRefetch }: BadgeTypeListProps) => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [autoAwarding, setAutoAwarding] = useState(false);
  const { toast } = useToast();

  const handleDelete = async (badgeId: string) => {
    try {
      setDeleting(badgeId);
      await deleteBadgeType(badgeId);
      onRefetch();
      toast({
        title: "Success",
        description: "Badge type deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast({
        title: "Error",
        description: "Failed to delete badge type",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleAutoAward = async () => {
    try {
      setAutoAwarding(true);
      await autoAwardPerformanceBadges();
      toast({
        title: "Success",
        description: "Performance badges have been automatically awarded",
      });
    } catch (error) {
      console.error('Error auto-awarding badges:', error);
      toast({
        title: "Error",
        description: "Failed to auto-award badges",
        variant: "destructive",
      });
    } finally {
      setAutoAwarding(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Badge Types ({badgeTypes.length})</h2>
        <Button 
          onClick={handleAutoAward}
          disabled={autoAwarding}
          variant="outline"
        >
          <Award className="h-4 w-4 mr-2" />
          {autoAwarding ? "Auto-Awarding..." : "Auto-Award Performance Badges"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {badgeTypes.map((badge) => (
          <Card key={badge.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-xl">{badge.icon}</span>
                  {badge.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Badge Type</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this badge type? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(badge.id)}
                          disabled={deleting === badge.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting === badge.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{badge.description}</p>
              <div className="flex gap-2">
                <Badge 
                  variant="secondary" 
                  style={{ backgroundColor: badge.color, color: 'white' }}
                >
                  {badge.category}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BadgeTypeList;
