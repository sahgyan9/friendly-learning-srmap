
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const BecomeAMentorForm = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    skills: "",
    bio: "",
    profileImage: "https://randomuser.me/api/portraits/men/1.jpg", // Default image
    linkedinUrl: "",
    rating: 4.5, // Default rating
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert skills string to array
      const skillsArray = formData.skills.split(',').map(skill => skill.trim());
      
      const { data, error } = await supabase
        .from('mentors')
        .insert([
          {
            name: formData.name,
            department: formData.department,
            skills: skillsArray,
            bio: formData.bio,
            profile_image: formData.profileImage,
            linkedin_url: formData.linkedinUrl,
            rating: formData.rating,
          }
        ]);

      if (error) throw error;
      
      toast({
        title: "Success!",
        description: "You are now registered as a mentor.",
      });
      
      onClose();
      navigate('/mentors');
    } catch (error: any) {
      console.error("Error submitting mentor form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit your mentor application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input 
          id="name" 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          required 
        />
      </div>
      
      <div>
        <Label htmlFor="department">Department</Label>
        <Input 
          id="department" 
          name="department" 
          value={formData.department} 
          onChange={handleChange} 
          required 
        />
      </div>
      
      <div>
        <Label htmlFor="skills">Skills (comma separated)</Label>
        <Input 
          id="skills" 
          name="skills" 
          value={formData.skills} 
          onChange={handleChange} 
          placeholder="React, JavaScript, Data Science" 
          required 
        />
      </div>
      
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea 
          id="bio" 
          name="bio" 
          value={formData.bio} 
          onChange={handleChange} 
          placeholder="Tell us about yourself and how you can help others" 
          required 
        />
      </div>
      
      <div>
        <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
        <Input 
          id="linkedinUrl" 
          name="linkedinUrl" 
          value={formData.linkedinUrl} 
          onChange={handleChange} 
          placeholder="https://linkedin.com/in/yourprofile" 
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
};

export default BecomeAMentorForm;
