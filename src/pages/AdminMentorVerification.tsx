
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
      console.log('Fetching verification data for status:', selectedStatus);
      
      const [verificationsResult, statsResult] = await Promise.all([
        getAllMentorVerifications(selectedStatus),
        getVerificationStatistics()
      ]);

      if (verificationsResult.data) {
        console.log('Verifications loaded:', verificationsResult.data.length);
        setVerifications(verificationsResult.data);
      }

      if (statsResult.data) {
        console.log('Statistics loaded:', statsResult.data);
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error fetching verification data:', error);
      toast({
        title: "Error",
        description: `Failed to load verification data: ${error.message || 'Unknown error'}`,
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
    console.log('Verification status updated, refreshing data');
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
