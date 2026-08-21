import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import ArticleList from "@/components/admin/articles/ArticleList";
import ArticleForm from "@/components/admin/articles/ArticleForm";
import { useArticles } from "@/hooks/useArticles";
import { KnowledgeArticle } from "@/integrations/supabase/services/articles";

type ViewState = { mode: "list" } | { mode: "create" } | { mode: "edit"; article: KnowledgeArticle };

const AdminArticles = () => {
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const { articles, loading, refetch } = useArticles();

  const handleSuccess = (message: string) => {
    setView({ mode: "list" });
    refetch();
    toast.success(message);
  };

  return (
    <AdminLayout>
      <AdminHeader
        title="Knowledge Articles"
        description="Write and format reference content yourself — it's searchable in Ask AI shortly after publishing"
        action={
          view.mode === "list" && (
            <Button onClick={() => setView({ mode: "create" })}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          )
        }
      />

      {view.mode === "create" && (
        <ArticleForm
          onCancel={() => setView({ mode: "list" })}
          onSuccess={() => handleSuccess("Article published — it will show up in Ask AI shortly.")}
        />
      )}

      {view.mode === "edit" && (
        <ArticleForm
          existingArticle={view.article}
          onCancel={() => setView({ mode: "list" })}
          onSuccess={() => handleSuccess("Article updated — changes will show up in Ask AI shortly.")}
        />
      )}

      {view.mode === "list" && (
        <ArticleList
          articles={articles}
          loading={loading}
          onRefetch={refetch}
          onEdit={(article) => setView({ mode: "edit", article })}
        />
      )}
    </AdminLayout>
  );
};

export default AdminArticles;
