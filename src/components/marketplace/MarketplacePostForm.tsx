
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { 
  createMarketplacePost, 
  updateMarketplacePost,
  uploadMarketplaceImage,
  MarketplacePost,
  MarketplacePostInput
} from "@/integrations/supabase/services/marketplace";

const marketplacePostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  author: z.string().min(2, "Author name must be at least 2 characters"),
  contact_info: z.string().optional(),
  external_link: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof marketplacePostSchema>;

interface MarketplacePostFormProps {
  post?: MarketplacePost;
  onComplete: () => void;
}

const MarketplacePostForm = ({ post, onComplete }: MarketplacePostFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.image_url || null);

  const defaultValues = {
    title: post?.title || "",
    description: post?.description || "",
    category: post?.category || "",
    author: post?.author || "",
    contact_info: post?.contact_info || "",
    external_link: post?.external_link || "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(marketplacePostSchema),
    defaultValues,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    const fileInput = document.getElementById("image") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Handle image upload first if there is a file
      const fileInput = document.getElementById("image") as HTMLInputElement;
      const file = fileInput?.files?.[0];
      let imageUrl = post?.image_url;

      if (file) {
        setIsUploading(true);
        const { url } = await uploadMarketplaceImage(file);
        imageUrl = url;
        setIsUploading(false);
      }

      const postData: MarketplacePostInput = {
        title: data.title,
        description: data.description,
        category: data.category,
        date: new Date().toISOString(),
        author: data.author,
        image_url: imageUrl,
        contact_info: data.contact_info || undefined,
        external_link: data.external_link || undefined,
      };

      // Create or update post
      if (post?.id) {
        // Update existing post
        await updateMarketplacePost(post.id, postData);

        toast.success("Success", {
          description: "Post updated successfully!",
        });
      } else {
        // Create new post
        await createMarketplacePost(postData);

        toast.success("Success", {
          description: "Post created successfully!",
        });
      }

      onComplete();
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error("Error", {
        description: "Failed to save post. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          {imagePreview ? (
            <div className="relative w-full max-w-md mb-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-md h-48 bg-muted flex items-center justify-center rounded-md mb-4">
              <p className="text-muted-foreground">No image selected</p>
            </div>
          )}

          <div>
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("image")?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {imagePreview ? "Change Image" : "Upload Image"}
                </>
              )}
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter post title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="news">University News</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="ads">Advertisements</SelectItem>
                  <SelectItem value="courses">Course Materials</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter post description"
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author</FormLabel>
              <FormControl>
                <Input placeholder="Enter author name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Information (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Phone number or email" {...field} />
              </FormControl>
              <FormDescription>
                Contact information for interested users
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="external_link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External Link (optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/register" {...field} />
              </FormControl>
              <FormDescription>
                Link to registration form or more information
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onComplete}
            disabled={isSubmitting || isUploading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {post ? "Updating..." : "Creating..."}
              </>
            ) : (
              post ? "Update Post" : "Create Post"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MarketplacePostForm;
