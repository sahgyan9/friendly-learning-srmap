
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBadgeType } from "@/integrations/supabase/services/badges";
import { toast } from "sonner";

interface BadgeCreationFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const BadgeCreationForm = ({ onCancel, onSuccess }: BadgeCreationFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    color: "#3B82F6",
    category: "performance" as "performance" | "expertise" | "contribution" | "special"
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Error", {
        description: "Badge name is required",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await createBadgeType({
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        category: formData.category
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to create badge type",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Badge Type</CardTitle>
        <CardDescription>
          Create a new badge type that can be awarded to users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Badge Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter badge name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this badge represents"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="icon">Icon (Emoji)</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="🏆"
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: "performance" | "expertise" | "contribution" | "special") => 
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="expertise">Expertise</SelectItem>
                <SelectItem value="contribution">Contribution</SelectItem>
                <SelectItem value="special">Special</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Badge"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BadgeCreationForm;
