
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import VerificationList from "@/components/admin/verification/VerificationList";
import VerificationStats from "@/components/admin/verification/VerificationStats";
import VerificationFilters, { VerificationFilters as FilterType } from "@/components/admin/verification/VerificationFilters";
import { getAllMentorVerifications, getVerificationStatistics } from "@/integrations/supabase/services/mentor-verification";

const AdminMentorVerification = () => {
  const [allVerifications, setAllVerifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    department: '',
    university: '',
    cgpaRange: '',
    yearOfStudies: ''
  });
  const { toast } = useToast();

  // Filter and process verifications
  const filteredVerifications = useMemo(() => {
    let filtered = allVerifications.filter((verification: any) => 
      verification.status === selectedStatus
    );

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((verification: any) => {
        const userData = verification.user || {};
        const appData = verification.application_data || {};
        
        return (
          userData.name?.toLowerCase().includes(searchTerm) ||
          userData.email?.toLowerCase().includes(searchTerm) ||
          appData.name?.toLowerCase().includes(searchTerm) ||
          appData.skills?.toLowerCase().includes(searchTerm) ||
          appData.bio?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply department filter
    if (filters.department) {
      filtered = filtered.filter((verification: any) => {
        const department = verification.application_data?.department || verification.user?.department;
        return department === filters.department;
      });
    }

    // Apply university filter
    if (filters.university) {
      const universityTerm = filters.university.toLowerCase();
      filtered = filtered.filter((verification: any) => 
        verification.university?.toLowerCase().includes(universityTerm)
      );
    }

    // Apply CGPA range filter
    if (filters.cgpaRange) {
      filtered = filtered.filter((verification: any) => {
        const verificationCgpa = parseFloat(verification.cgpa);
        if (isNaN(verificationCgpa)) return false;
        
        switch (filters.cgpaRange) {
          case '9.0-10.0':
            return verificationCgpa >= 9.0 && verificationCgpa <= 10.0;
          case '8.0-8.9':
            return verificationCgpa >= 8.0 && verificationCgpa < 9.0;
          case '7.0-7.9':
            return verificationCgpa >= 7.0 && verificationCgpa < 8.0;
          case '6.0-6.9':
            return verificationCgpa >= 6.0 && verificationCgpa < 7.0;
          case 'below-6.0':
            return verificationCgpa < 6.0;
          default:
            return true;
        }
      });
    }

    // Apply year of studies filter
    if (filters.yearOfStudies) {
      filtered = filtered.filter((verification: any) => 
        verification.year_of_studies === filters.yearOfStudies
      );
    }

    return filtered;
  }, [allVerifications, selectedStatus, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching all verification data');
      
      const [verificationsResult, statsResult] = await Promise.all([
        getAllMentorVerifications(), // Get all verifications, we'll filter on frontend
        getVerificationStatistics()
      ]);

      if (verificationsResult.data) {
        console.log('All verifications loaded:', verificationsResult.data.length);
        setAllVerifications(verificationsResult.data);
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
  }, []);

  const handleStatusUpdate = () => {
    console.log('Verification status updated, refreshing data');
    fetchData();
    toast({
      title: "Success",
      description: "Verification status updated successfully",
    });
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const totalForStatus = allVerifications.filter((v: any) => v.status === selectedStatus).length;

  return (
    <AdminLayout>
      <AdminHeader
        title="Mentor Verification Management"
        description="Review and manage mentor verification applications with detailed insights"
      />

      <div className="space-y-6">
        <VerificationStats stats={stats} />
        
        <VerificationFilters 
          onFiltersChange={handleFiltersChange}
          totalResults={totalForStatus}
          filteredResults={filteredVerifications.length}
        />
        
        <VerificationList
          verifications={filteredVerifications}
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
