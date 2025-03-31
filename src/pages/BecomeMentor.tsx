
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addMentor, supabase } from "@/integrations/supabase/client"; // Added supabase import here
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const BecomeMentor = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    department: "",
    skills: "",
    bio: "",
    linkedin_url: "",
    profile_image: profile?.profile_image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to become a mentor");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert skills string to array
      const skillsArray = formData.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
      
      // Validate form
      if (!formData.name || !formData.department || skillsArray.length === 0) {
        throw new Error("Please fill in all required fields");
      }
      
      const mentorData = {
        id: user.id, // Use the user's ID for the mentor record
        name: formData.name,
        department: formData.department,
        skills: skillsArray,
        bio: formData.bio,
        linkedin_url: formData.linkedin_url || null,
        profile_image: formData.profile_image,
        rating: 4.0,
        review_count: 0
      };
      
      // First, update the user's role to 'mentor' in the users table
      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'mentor' })
        .eq('id', user.id);
      
      if (userError) throw userError;
      
      // Then add the mentor record
      const { error } = await addMentor(mentorData);
      
      if (error) throw error;
      
      toast.success("Your mentor profile has been created successfully!");
      
      // Navigate to the user's profile page
      navigate('/profile');
    } catch (error: any) {
      console.error("Error creating mentor profile:", error);
      toast.error(error.message || "Failed to create mentor profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container px-4 py-16 md:py-24 mx-auto">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Become a Mentor</h1>
            <p className="text-muted-foreground">
              Share your knowledge and help other students excel in their academic journey.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Business Administration">Business Administration</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills <span className="text-red-500">*</span></Label>
                <Input
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  required
                  placeholder="Python, Data Structures, Machine Learning (comma separated)"
                />
                <p className="text-xs text-gray-500">List your areas of expertise (comma separated)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell students about yourself, your experience, and how you can help them"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BecomeMentor;
