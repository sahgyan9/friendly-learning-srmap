import { useState, useEffect, useCallback } from "react";
import { getArticles, KnowledgeArticle } from "@/integrations/supabase/services/articles";

export const useArticles = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getArticles();
      setArticles(data ?? []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, refetch: fetchArticles };
};
