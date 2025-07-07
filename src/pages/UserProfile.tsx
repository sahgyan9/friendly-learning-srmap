
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AcademicInfoSection from "@/components/profile/AcademicInfoSection";

const UserProfile = () => {
  const { user, profile, refreshProfile, isMentor } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [mentorData, setMentorData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    skills: '',
    bio: '',
    linkedin_url: '',
    phone: '',
    university: '',
    year_of_studies: '',
    cgpa: '',
    hobbies: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    // Load profile data
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || '',
        email: profile.email || '',
        department: profile.department || '',
        skills: profile.skills ? profile.skills.join(', ') : '',
        bio: profile.bio || '',
        linkedin_url: profile.linkedin_url || '',
        phone: profile.phone || ''
      }));
    }

    // Load mentor data if user is a mentor
    if (isMentor) {
      fetchMentorData();
    }
  }, [user, profile, navigate, isMentor]);

  const fetchMentorData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('university, year_of_studies, cgpa, hobbies')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching mentor data:', error);
        return;
      }
      
      if (data) {
        setMentorData(data);
        setFormData(prev => ({
          ...prev,
          university: data.university || '',
          year_of_studies: data.year_of_studies || '',
          cgpa: data.cgpa ? data.cgpa.toString() : '',
          hobbies: data.hobbies || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching mentor data:', error);
    }
  };

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
      toast.error("You must be logged in to update your profile");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          department: formData.department,
          skills: formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill !== ''),
          bio: formData.bio,
          linkedin_url: formData.linkedin_url,
          phone: formData.phone
        })
        .eq('id', user.id);
      
      if (userError) throw userError;
      
      // Update mentor table if user is a mentor
      if (isMentor) {
        const { error: mentorError } = await supabase
          .from('mentors')
          .update({
            name: formData.name,
            department: formData.department,
            skills: formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill !== ''),
            bio: formData.bio,
            linkedin_url: formData.linkedin_url,
            university: formData.university,
            year_of_studies: formData.year_of_studies,
            cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
            hobbies: formData.hobbies
          })
          .eq('id', user.id);
        
        if (mentorError) throw mentorError;
      }
      
      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information and preferences
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed here. Contact support if needed.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Your phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Your department or field of study"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <Input
                    id="skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="React, JavaScript, Python (comma-separated)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us about yourself..."
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                </div>
              </CardContent>
            </Card>

            <AcademicInfoSection 
              formData={formData}
              handleChange={handleChange}
              isMentor={isMentor}
            />
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
