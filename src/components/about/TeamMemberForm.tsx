
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";
import { 
  createTeamMember, 
  updateTeamMember,
  uploadTeamMemberImage,
  TeamMember
} from "@/integrations/supabase/services/team-members";

const teamMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  position: z.string().min(2, "Position must be at least 2 characters"),
  email: z.string().email("Please enter a valid email").or(z.literal("")),
});

type FormValues = z.infer<typeof teamMemberSchema> & { image?: FileList };

interface TeamMemberFormProps {
  member?: TeamMember;
  onComplete: () => void;
}

const TeamMemberForm = ({ member, onComplete }: TeamMemberFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(member?.image_url || null);
  const { toast } = useToast();

  const defaultValues = {
    name: member?.name || "",
    position: member?.position || "",
    email: member?.email || "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(teamMemberSchema),
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
      let imageUrl = member?.image_url;

      if (file) {
        setIsUploading(true);
        const { data: uploadData, error: uploadError } = await uploadTeamMemberImage(file);
        
        if (uploadError) {
          toast({
            title: "Error uploading image",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }
        
        imageUrl = uploadData?.url;
        setIsUploading(false);
      }

      // Create or update team member
      if (member?.id) {
        // Update existing team member
        const { error } = await updateTeamMember(member.id, {
          ...data,
          image_url: imageUrl,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team member updated successfully!",
        });
      } else {
        // Create new team member - Fix for type error here
        // Ensure name and position are always passed as they are required
        const teamMemberData = {
          name: data.name, // This is required
          position: data.position, // This is required
          email: data.email || undefined, // This is optional
          image_url: imageUrl || undefined, // This is optional
        };

        const { error } = await createTeamMember(teamMemberData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Team member created successfully!",
        });
      }

      onComplete();
    } catch (error) {
      console.error("Error saving team member:", error);
      toast({
        title: "Error",
        description: "Failed to save team member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <Avatar className="w-32 h-32">
              {imagePreview ? (
                <AvatarImage src={imagePreview} alt="Preview" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-2xl">
                  {form.getValues("name")
                    ? form.getValues("name")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                    : "?"}
                </AvatarFallback>
              )}
            </Avatar>
            {imagePreview && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-0 right-0 h-6 w-6 rounded-full"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

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
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                </>
              )}
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Lead Developer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (optional)</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormDescription>
                Public email to display on the website
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
                {member ? "Updating..." : "Creating..."}
              </>
            ) : (
              member ? "Update Team Member" : "Create Team Member"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TeamMemberForm;
