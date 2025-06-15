
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import VerificationList from "@/components/admin/verification/VerificationList";
import VerificationStats from "@/components/admin/verification/VerificationStats";
import { getAllMentorVerifications, getVerificationStatistics } from "@/integrations/supabase/services/mentor-verification";

const AdminMentorVerification = () => {
  const [verifications, setVerifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [verificationsResult, statsResult] = await Promise.all([
        getAllMentorVerifications(selectedStatus),
        getVerificationStatistics()
      ]);

      if (verificationsResult.data) {
        setVerifications(verificationsResult.data);
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error fetching verification data:', error);
      toast({
        title: "Error",
        description: "Failed to load verification data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStatus]);

  const handleStatusUpdate = () => {
    fetchData();
    toast({
      title: "Success",
      description: "Verification status updated successfully",
    });
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Mentor Verification"
        description="Review and manage mentor verification applications"
      />

      <div className="space-y-6">
        <VerificationStats stats={stats} />
        
        <VerificationList
          verifications={verifications}
          loading={loading}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminMentorVerification;
