import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Ad } from "@/types/mentor";
import { Loader2 } from "lucide-react";

interface CreateAdFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const CreateAdForm = ({ onSuccess, onCancel }: CreateAdFormProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        image_url: "",
        price: "",
        features: "",
        cta_text: "Learn More",
        cta_url: "",
        badge_text: "Featured",
        badge_color: "#1976d2"
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || user.email !== "sahgyan9@gmail.com") {
                toast.error("Only admin can create ads");
                return;
            }

            const adData: Partial<Ad> = {
                ...formData,
                features: formData.features.split(",").map(f => f.trim()),
                created_by: user.id
            };

            const { error } = await supabase
                .from("ads")
                .insert(adData);

            if (error) throw error;

            toast.success("Ad created successfully!");
            onSuccess();
        } catch (error: any) {
            console.error("Error creating ad:", error);
            toast.error(error.message || "Error creating ad");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <Label htmlFor="title">Ad Title</Label>
                <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="Enter ad title"
                />
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    placeholder="Enter ad description"
                />
            </div>

            <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                    id="image_url"
                    name="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={handleChange}
                    required
                    placeholder="Enter image URL"
                />
            </div>

            <div>
                <Label htmlFor="price">Price (optional)</Label>
                <Input
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Enter price (e.g., $99)"
                />
            </div>

            <div>
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Input
                    id="features"
                    name="features"
                    value={formData.features}
                    onChange={handleChange}
                    placeholder="Feature 1, Feature 2, Feature 3"
                />
            </div>

            <div>
                <Label htmlFor="cta_text">Call to Action Text</Label>
                <Input
                    id="cta_text"
                    name="cta_text"
                    value={formData.cta_text}
                    onChange={handleChange}
                    required
                    placeholder="Enter CTA text"
                />
            </div>

            <div>
                <Label htmlFor="cta_url">Call to Action URL</Label>
                <Input
                    id="cta_url"
                    name="cta_url"
                    type="url"
                    value={formData.cta_url}
                    onChange={handleChange}
                    required
                    placeholder="Enter CTA URL"
                />
            </div>

            <div className="flex gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        "Create Ad"
                    )}
                </Button>
            </div>
        </form>
    );
};

export default CreateAdForm; 