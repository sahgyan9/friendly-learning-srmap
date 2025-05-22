
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();

  const fetchAdminUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getAdminUsers();
      setAdminUsers(data);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive",
      });
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
