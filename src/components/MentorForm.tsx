
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MentorForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    skills: "",
    bio: "",
    profile_image: "https://avatars.githubusercontent.com/u/124599?v=4", // Default image
    linkedin_url: "",
    rating: 5.0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Convert skills string to array
      const skillsArray = formData.skills
        .split(",")
        .map(skill => skill.trim())
        .filter(skill => skill !== "");

      const { data, error } = await supabase
        .from('mentors')
        .insert([{
          name: formData.name,
          department: formData.department,
          skills: skillsArray,
          bio: formData.bio,
          profile_image: formData.profile_image,
          linkedin_url: formData.linkedin_url,
          rating: formData.rating
        }]);

      if (error) {
        console.error("Error inserting mentor:", error);
        toast({
          title: "Error",
          description: `Failed to add mentor: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "You have successfully registered as a mentor!",
        });
        
        // Reset form and close dialog
        setFormData({
          name: "",
          department: "",
          skills: "",
          bio: "",
          profile_image: "https://avatars.githubusercontent.com/u/124599?v=4",
          linkedin_url: "",
          rating: 5.0
        });
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline">Become a Mentor</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-4">Become a Mentor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input 
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Your department or specialization"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Input 
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="Skills (comma separated: React, Node.js, etc.)"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself and your expertise"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profile_image">Profile Image URL</Label>
            <Input 
              id="profile_image"
              name="profile_image"
              value={formData.profile_image}
              onChange={handleChange}
              placeholder="URL to your profile picture"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL (optional)</Label>
            <Input 
              id="linkedin_url"
              name="linkedin_url"
              value={formData.linkedin_url}
              onChange={handleChange}
              placeholder="Your LinkedIn profile URL"
            />
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MentorForm;
