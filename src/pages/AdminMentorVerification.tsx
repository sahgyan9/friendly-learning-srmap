
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import VerificationList from "@/components/admin/verification/VerificationList";
import VerificationStats from "@/components/admin/verification/VerificationStats";
import VerificationFilters, { VerificationFilters as FilterType } from "@/components/admin/verification/VerificationFilters";
import { getAllMentorVerifications, getVerificationStatistics } from "@/integrations/supabase/services/mentor-verification";
import { listMentorWelcomeStatus, type WelcomeStatusMap } from "@/integrations/supabase/services/welcome-emails";

/**
 * The fields this page filters and counts on. The rows carry more than this —
 * they are joined with the applicant's user record — but narrowing to what is
 * actually read here keeps the predicates typed without having to describe the
 * whole join.
 */
type VerificationRow = {
  status: string;
  flags?: string[] | null;
  [key: string]: unknown;
};

const AdminMentorVerification = () => {
  const [allVerifications, setAllVerifications] = useState<VerificationRow[]>([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [welcomeStatus, setWelcomeStatus] = useState<WelcomeStatusMap>(new Map());
  const [unwelcomedOnly, setUnwelcomedOnly] = useState(false);
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
    // "flagged" is not a status — applications are approved on submission, so the
    // review queue is the approved ones that failed an automated check. Without
    // this tab the flags would never be seen, since Pending is always empty.
    let filtered =
      selectedStatus === "flagged"
        ? allVerifications.filter((verification: VerificationRow) => verification.flags?.length > 0)
        : allVerifications.filter((verification: VerificationRow) => verification.status === selectedStatus);

    // Only meaningful on the approved tab, which is where the welcome lives.
    if (selectedStatus === "approved" && unwelcomedOnly) {
      filtered = filtered.filter(
        (verification: VerificationRow) =>
          !welcomeStatus.get(verification.user_id as string)?.welcomed,
      );
    }

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
  }, [allVerifications, selectedStatus, filters, unwelcomedOnly, welcomeStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [verificationsResult, statsResult, welcome] = await Promise.all([
        getAllMentorVerifications(), // Get all verifications, we'll filter on frontend
        getVerificationStatistics(),
        // Resolves to an empty map rather than throwing if the tracking
        // migration has not been applied, so the page still works without it.
        listMentorWelcomeStatus()
      ]);

      if (verificationsResult.data) {
        setAllVerifications(verificationsResult.data);
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }

      setWelcomeStatus(welcome);
    } catch (error) {
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
    fetchData();
    toast({
      title: "Success",
      description: "Verification status updated successfully",
    });
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const totalForStatus =
    selectedStatus === "flagged"
      ? allVerifications.filter((v: VerificationRow) => v.flags?.length > 0).length
      : allVerifications.filter((v: VerificationRow) => v.status === selectedStatus).length;

  const flaggedCount = allVerifications.filter((v: VerificationRow) => v.flags?.length > 0).length;

  const unwelcomedCount = allVerifications.filter(
    (v: VerificationRow) =>
      v.status === "approved" && !welcomeStatus.get(v.user_id as string)?.welcomed,
  ).length;

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
          flaggedCount={flaggedCount}
          onStatusChange={setSelectedStatus}
          onStatusUpdate={handleStatusUpdate}
          welcomeStatus={welcomeStatus}
          unwelcomedOnly={unwelcomedOnly}
          onUnwelcomedOnlyChange={setUnwelcomedOnly}
          unwelcomedCount={unwelcomedCount}
          onWelcomeSent={fetchData}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminMentorVerification;
