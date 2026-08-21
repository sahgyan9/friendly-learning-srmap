import { useState, useEffect, useCallback } from "react";
import { getNotices, CampusNotice } from "@/integrations/supabase/services/notices";

export const useNotices = () => {
  const [notices, setNotices] = useState<CampusNotice[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getNotices();
      setNotices(data ?? []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  return { notices, loading, refetch: fetchNotices };
};
