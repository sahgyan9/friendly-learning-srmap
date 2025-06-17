
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BadgeType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
}

interface EditBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: BadgeType | null;
  onBadgeUpdated: () => void;
}

const EditBadgeModal = ({ isOpen, onClose, badge, onBadgeUpdated }: EditBadgeModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    color: "#3B82F6",
    category: "none"
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (badge) {
      setFormData({
        name: badge.name || "",
        description: badge.description || "",
        icon: badge.icon || "",
        color: badge.color || "#3B82F6",
        category: badge.category || "none"
      });
    }
  }, [badge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badge) return;

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('badge_types')
        .update({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon || null,
          color: formData.color,
          category: formData.category === "none" ? null : formData.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', badge.id);

      if (error) throw error;

      toast.success('Badge updated successfully');
      onBadgeUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating badge:', error);
      toast.error(error.message || 'Failed to update badge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Badge</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Badge Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="icon">Icon (Lucide icon name)</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              placeholder="e.g., Star, Award, Trophy"
            />
          </div>
          
          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => handleChange('color', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                <SelectItem value="Achievement">Achievement</SelectItem>
                <SelectItem value="Participation">Participation</SelectItem>
                <SelectItem value="Excellence">Excellence</SelectItem>
                <SelectItem value="Recognition">Recognition</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Badge'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBadgeModal;
