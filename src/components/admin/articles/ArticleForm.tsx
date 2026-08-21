import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import ArticleEditor from "./ArticleEditor";
import {
  createArticle,
  updateArticle,
  triggerEmbedding,
  slugify,
  KnowledgeArticle,
} from "@/integrations/supabase/services/articles";

interface ArticleFormProps {
  existingArticle?: KnowledgeArticle;
  onCancel: () => void;
  onSuccess: () => void;
}

const ArticleForm = ({ existingArticle, onCancel, onSuccess }: ArticleFormProps) => {
  const isEditing = !!existingArticle;
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEditing);

  const [title, setTitle] = useState(existingArticle?.title ?? "");
  const [slug, setSlug] = useState(existingArticle?.slug ?? "");
  const [category, setCategory] = useState(existingArticle?.category ?? "general");
  const [isPublished, setIsPublished] = useState(existingArticle?.is_published ?? true);
  const [contentHtml, setContentHtml] = useState(existingArticle?.content_html ?? "");
  const [contentText, setContentText] = useState(existingArticle?.content_text ?? "");

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !slug.trim() || !contentText.trim()) {
      toast.error("Title, slug, and body content are required");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateArticle(existingArticle.id, {
          title: title.trim(),
          slug: slug.trim(),
          category: category.trim() || "general",
          content_html: contentHtml,
          content_text: contentText,
          is_published: isPublished,
        });
      } else {
        await createArticle({
          title: title.trim(),
          slug: slug.trim(),
          category: category.trim() || "general",
          content_html: contentHtml,
          content_text: contentText,
          is_published: isPublished,
        });
      }

      triggerEmbedding();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${isEditing ? "update" : "publish"} article`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Article" : "New Article"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Changes are re-indexed for AI search automatically after saving."
            : "Write in your own words with formatting — it becomes searchable in Ask AI shortly after publishing."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Student Outpass Policy"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="student-outpass-policy"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. hostel_policy, leadership, campus_event"
              />
            </div>
          </div>

          <div>
            <Label>Body</Label>
            <ArticleEditor
              content={contentHtml}
              onChange={(html, text) => {
                setContentHtml(html);
                setContentText(text);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="is_published" checked={isPublished} onCheckedChange={setIsPublished} />
            <Label htmlFor="is_published">Published (visible to AI search and readers)</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Publish Article"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ArticleForm;
