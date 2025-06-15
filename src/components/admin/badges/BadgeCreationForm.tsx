
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createBadgeType } from "@/integrations/supabase/services/badges";

const badgeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  category: z.enum(["performance", "expertise", "contribution", "special"]),
});

type BadgeFormData = z.infer<typeof badgeSchema>;

interface BadgeCreationFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const BadgeCreationForm = ({ onCancel, onSuccess }: BadgeCreationFormProps) => {
  const [creating, setCreating] = useState(false);

  const form = useForm<BadgeFormData>({
    resolver: zodResolver(badgeSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      color: "#3B82F6",
      category: "expertise",
    },
  });

  const onSubmit = async (data: BadgeFormData) => {
    try {
      setCreating(true);
      await createBadgeType(data);
      onSuccess();
    } catch (error) {
      console.error('Error creating badge:', error);
    } finally {
      setCreating(false);
    }
  };

  const commonIcons = ["🏆", "⭐", "🎯", "💎", "🚀", "⚡", "🔥", "💪", "🎨", "🧠", "❤️", "👑"];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Badge Type</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Badge Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., JavaScript Expert" {...field} />
                  </FormControl>
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
                      placeholder="Describe what this badge represents..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter an emoji or icon" {...field} />
                  </FormControl>
                  <div className="flex gap-1 mt-2">
                    {commonIcons.map((icon) => (
                      <Button
                        key={icon}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue("icon", icon)}
                        className="p-2"
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="expertise">Expertise</SelectItem>
                      <SelectItem value="contribution">Contribution</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Badge"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BadgeCreationForm;
