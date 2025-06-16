
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBadges } from "@/hooks/useBadges";
import BadgeSearchFilter from "./BadgeSearchFilter";
import EditBadgeModal from "./EditBadgeModal";

interface BadgeType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
}

const BadgeTypeList = () => {
  const { badgeTypes, isLoading, refetch } = useBadges();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingBadge, setEditingBadge] = useState<BadgeType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filteredBadges = badgeTypes?.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || badge.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const handleEdit = (badge: BadgeType) => {
    setEditingBadge(badge);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (badgeId: string, badgeName: string) => {
    if (!confirm(`Are you sure you want to delete the "${badgeName}" badge? This action cannot be undone.`)) {
      return;
    }

    try {
      // First check if badge is in use
      const { data: userBadges, error: checkError } = await supabase
        .from('user_badges')
        .select('id')
        .eq('badge_type_id', badgeId)
        .limit(1);

      if (checkError) throw checkError;

      if (userBadges && userBadges.length > 0) {
        toast.error('Cannot delete badge that has been awarded to users');
        return;
      }

      const { error } = await supabase
        .from('badge_types')
        .delete()
        .eq('id', badgeId);

      if (error) throw error;

      toast.success('Badge deleted successfully');
      refetch();
    } catch (error: any) {
      console.error('Error deleting badge:', error);
      toast.error(error.message || 'Failed to delete badge');
    }
  };

  const handleViewUsers = (badgeId: string, badgeName: string) => {
    // TODO: Navigate to user management page filtered by this badge
    toast.info(`Viewing users with "${badgeName}" badge - Feature coming soon!`);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading badges...</div>;
  }

  return (
    <div>
      <BadgeSearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      <div className="grid gap-4">
        {filteredBadges.map((badge) => (
          <div key={badge.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: badge.color || '#3B82F6' }}
                >
                  {badge.icon ? badge.icon.charAt(0) : badge.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold">{badge.name}</h3>
                  {badge.description && (
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    {badge.category && (
                      <Badge variant="secondary" className="text-xs">
                        {badge.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewUsers(badge.id, badge.name)}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(badge)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(badge.id, badge.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        
        {filteredBadges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No badges found matching your criteria.
          </div>
        )}
      </div>

      <EditBadgeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBadge(null);
        }}
        badge={editingBadge}
        onBadgeUpdated={refetch}
      />
    </div>
  );
};

export default BadgeTypeList;
