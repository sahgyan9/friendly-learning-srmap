import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import BadgeTypeList from "@/components/admin/badges/BadgeTypeList";
import BadgeCreationForm from "@/components/admin/badges/BadgeCreationForm";
import BadgeAwardModal from "@/components/admin/badges/BadgeAwardModal";
import BadgeStatistics from "@/components/admin/badges/BadgeStatistics";
import { useBadges } from "@/hooks/useBadges";

const AdminBadges = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const { badgeTypes, loading, refetch } = useBadges();
  const { toast } = useToast();

  const handleBadgeCreated = () => {
    setShowCreateForm(false);
    refetch();
    toast({
      title: "Success",
      description: "Badge type created successfully",
    });
  };

  const handleBadgeAwarded = () => {
    setShowAwardModal(false);
    toast({
      title: "Success",
      description: "Badge awarded successfully",
    });
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Badge Management"
        description="Create, manage, and award badges to users"
        action={
          <div className="flex gap-2">
            <Button onClick={() => setShowAwardModal(true)}>
              Award Badge
            </Button>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Badge
            </Button>
          </div>
        }
      />
      
      {/* Add Badge Statistics */}
      <div className="mb-8">
        <BadgeStatistics />
      </div>

      {showCreateForm ? (
        <BadgeCreationForm
          onCancel={() => setShowCreateForm(false)}
          onSuccess={handleBadgeCreated}
        />
      ) : (
        <BadgeTypeList
          badgeTypes={badgeTypes}
          loading={loading}
          onRefetch={refetch}
        />
      )}

      {showAwardModal && (
        <BadgeAwardModal
          badgeTypes={badgeTypes}
          onClose={() => setShowAwardModal(false)}
          onSuccess={handleBadgeAwarded}
        />
      )}
    </AdminLayout>
  );
};

export default AdminBadges;
