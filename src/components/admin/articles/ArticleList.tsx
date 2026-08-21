import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, EyeOff, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { deleteArticle, updateArticle, KnowledgeArticle } from "@/integrations/supabase/services/articles";
import { getErrorMessage } from "@/lib/errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ArticleListProps {
  articles: KnowledgeArticle[];
  loading: boolean;
  onRefetch: () => void;
  onEdit: (article: KnowledgeArticle) => void;
}

const ArticleList = ({ articles, loading, onRefetch, onEdit }: ArticleListProps) => {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      await deleteArticle(id);
      onRefetch();
      toast.success("Article deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete article"));
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublished = async (article: KnowledgeArticle) => {
    try {
      setToggling(article.id);
      await updateArticle(article.id, { is_published: !article.is_published });
      onRefetch();
      toast.success(article.is_published ? "Article unpublished" : "Article published");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update article"));
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No articles yet. Add the first one above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Articles ({articles.length})</h2>
      {articles.map((article) => (
        <Card key={article.id} className={article.is_published ? "" : "opacity-60"}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{article.title}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{article.category}</Badge>
                  <span>/{article.slug}</span>
                  {!article.is_published && <Badge variant="outline">Unpublished</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(article)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTogglePublished(article)}
                  disabled={toggling === article.id}
                  title={article.is_published ? "Unpublish" : "Publish"}
                >
                  {article.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Article</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{article.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(article.id)}
                        disabled={deleting === article.id}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting === article.id ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default ArticleList;
