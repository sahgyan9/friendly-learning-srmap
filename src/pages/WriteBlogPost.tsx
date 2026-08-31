import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import BlogPostEditor from "@/components/blog/BlogPostEditor";
import { BlogImageCropDialog } from "@/components/blog/BlogImageCropDialog";
import {
  createBlogPost,
  updateBlogPost,
  getBlogPostBySlug,
  triggerEmbedding,
  slugify,
  uploadBlogPostImage,
  type BlogPost,
} from "@/integrations/supabase/services/blog-posts";

const WriteBlogPost = () => {
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isEditing = Boolean(slugParam);

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [existing, setExisting] = useState<BlogPost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEditing);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [contentHtml, setContentHtml] = useState("");
  const [contentText, setContentText] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!slugParam) return;
    getBlogPostBySlug(slugParam).then((post) => {
      if (!post) {
        toast.error("Post not found");
        navigate("/blogs");
        return;
      }
      if (user && post.author_id !== user.id && !isAdmin) {
        toast.error("You can only edit your own posts");
        navigate(`/blogs/${post.slug}`);
        return;
      }
      setExisting(post);
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? "");
      setTagsInput(post.tags.join(", "));
      setCoverImageUrl(post.cover_image_url);
      setContentHtml(post.content_html);
      setContentText(post.content_text);
      setIsPublished(post.is_published);
      setLoadingExisting(false);
    });
    // Only re-run if the route param itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, user?.id]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleCoverCropped = async (file: File) => {
    setUploadingCover(true);
    try {
      const { url } = await uploadBlogPostImage(file);
      setCoverImageUrl(url);
      setPendingCoverFile(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload cover image"));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (publish: boolean) => {
    if (!user) return;
    if (!title.trim() || !slug.trim() || !contentText.trim()) {
      toast.error("Title, slug, and body content are required");
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        cover_image_url: coverImageUrl,
        content_html: contentHtml,
        content_text: contentText,
        tags,
        is_published: publish,
      };

      if (isEditing && existing) {
        await updateBlogPost(existing.id, payload);
      } else {
        await createBlogPost(user.id, payload);
      }

      if (publish) triggerEmbedding();
      toast.success(publish ? "Post published!" : "Draft saved");
      navigate(`/blogs/${slug.trim()}`);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${isEditing ? "update" : "publish"} post`));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEOHead title={isEditing ? "Edit Post | Community Blog" : "Write a Post | Community Blog"} />

      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-24 flex-1">
          <Link
            to="/blogs"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community Blog
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Post" : "Write a Post"}</CardTitle>
              <CardDescription>
                Write in your own words — save a draft any time, and publish when you're ready. It becomes searchable
                across the site shortly after publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g. What I Learned Building My First App" />
              </div>

              <div>
                <Label htmlFor="slug">URL slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="what-i-learned-building-my-first-app"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Short excerpt (optional)</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="One or two sentences shown on the blog list and in search results"
                  className="min-h-[70px]"
                />
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="hackathon, cse, first-year" />
              </div>

              <div>
                <Label>Cover image (optional)</Label>
                {coverImageUrl ? (
                  <div className="relative mt-1.5 overflow-hidden rounded-lg border">
                    <img src={coverImageUrl} alt="" className="aspect-video w-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-2 h-7 w-7"
                      onClick={() => setCoverImageUrl(null)}
                      aria-label="Remove cover image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="mt-1.5 flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/40">
                    {uploadingCover ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                    <span className="text-sm">Add a cover image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) setPendingCoverFile(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <Label>Body</Label>
                <div className="mt-1.5">
                  <BlogPostEditor
                    content={contentHtml}
                    onChange={(html, text) => {
                      setContentHtml(html);
                      setContentText(text);
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="is_published" checked={isPublished} onCheckedChange={setIsPublished} />
                <Label htmlFor="is_published">Published (visible to everyone and searchable)</Label>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => handleSubmit(false)}>
                  {submitting ? "Saving..." : "Save Draft"}
                </Button>
                <Button type="button" disabled={submitting} onClick={() => handleSubmit(true)}>
                  {submitting ? "Publishing..." : isPublished ? "Save Changes" : "Publish"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>

      <BlogImageCropDialog
        file={pendingCoverFile}
        saving={uploadingCover}
        onCancel={() => setPendingCoverFile(null)}
        onCropped={handleCoverCropped}
      />
    </>
  );
};

export default WriteBlogPost;
