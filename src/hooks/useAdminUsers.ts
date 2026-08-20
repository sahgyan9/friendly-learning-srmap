
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getAdminUsers } from "@/integrations/supabase/services/admin";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
}

export const useAdminUsers = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAdminUsers();
      setAdminUsers(data);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast.error("Failed to load admin users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  return {
    adminUsers,
    isLoading,
    refetchAdminUsers: fetchAdminUsers,
  };
};
