
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import VerificationList from "@/components/admin/verification/VerificationList";
import VerificationStats from "@/components/admin/verification/VerificationStats";
import VerificationFilters, { VerificationFilters as FilterType } from "@/components/admin/verification/VerificationFilters";
import {
  getAllMentorVerifications,
  getVerificationStatistics,
  type MentorVerificationWithUser,
} from "@/integrations/supabase/services/mentor-verification";
import { listMentorWelcomeStatus, type WelcomeStatusMap } from "@/integrations/supabase/services/welcome-emails";

const AdminMentorVerification = () => {
  const [allVerifications, setAllVerifications] = useState<MentorVerificationWithUser[]>([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [welcomeStatus, setWelcomeStatus] = useState<WelcomeStatusMap>(new Map());
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    department: '',
    university: '',
    cgpaRange: '',
    yearOfStudies: ''
  });

  // Filter and process verifications
  const filteredVerifications = useMemo(() => {
    // "flagged" is not a status — applications are approved on submission, so the
    // review queue is the approved ones that failed an automated check. Without
    // this tab the flags would never be seen, since Pending is always empty.
    let filtered =
      selectedStatus === "flagged"
        ? allVerifications.filter((verification: MentorVerificationWithUser) => verification.flags?.length > 0)
        : allVerifications.filter((verification: MentorVerificationWithUser) => verification.status === selectedStatus);


    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((verification: MentorVerificationWithUser) => {
        const userData = verification.user;
        const appData = verification.application_data;

        return (
          userData?.name?.toLowerCase().includes(searchTerm) ||
          userData?.email?.toLowerCase().includes(searchTerm) ||
          appData?.name?.toLowerCase().includes(searchTerm) ||
          appData?.skills?.toLowerCase().includes(searchTerm) ||
          appData?.bio?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply department filter
    if (filters.department) {
      filtered = filtered.filter((verification: MentorVerificationWithUser) => {
        const department = verification.application_data?.department || verification.user?.department;
        return department === filters.department;
      });
    }

    // Apply university filter
    if (filters.university) {
      const universityTerm = filters.university.toLowerCase();
      filtered = filtered.filter((verification: MentorVerificationWithUser) =>
        verification.university?.toLowerCase().includes(universityTerm)
      );
    }

    // Apply CGPA range filter
    if (filters.cgpaRange) {
      filtered = filtered.filter((verification: MentorVerificationWithUser) => {
        const verificationCgpa = verification.cgpa;
        if (verificationCgpa === null || isNaN(verificationCgpa)) return false;

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
      filtered = filtered.filter((verification: MentorVerificationWithUser) =>
        verification.year_of_studies === filters.yearOfStudies
      );
    }

    return filtered;
  }, [allVerifications, selectedStatus, filters]);

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

      setWelcomeStatus(welcome.byId);
    } catch (error) {
      toast.error("Error", {
        description: `Failed to load verification data: ${error.message || 'Unknown error'}`,
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
    toast.success("Success", {
      description: "Verification status updated successfully",
    });
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  const totalForStatus =
    selectedStatus === "flagged"
      ? allVerifications.filter((v: MentorVerificationWithUser) => v.flags?.length > 0).length
      : allVerifications.filter((v: MentorVerificationWithUser) => v.status === selectedStatus).length;

  const flaggedCount = allVerifications.filter((v: MentorVerificationWithUser) => v.flags?.length > 0).length;

  const unwelcomedCount = allVerifications.filter(
    (v: MentorVerificationWithUser) =>
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
          unwelcomedCount={unwelcomedCount}
          onWelcomeSent={fetchData}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminMentorVerification;
