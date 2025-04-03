
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile, isMentor } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMentorProfile, setIsMentorProfile] = useState(false);
  const [mentorData, setMentorData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profile_image: "",
    bio: "",
    department: "",
    skills: "",
    linkedin_url: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      console.log("Setting form data from profile:", profile);
      setFormData(prev => ({
        ...prev,
        name: profile.name || "",
        email: profile.email || "",
        profile_image: profile.profile_image || ""
      }));

      // Check if the user is a mentor
      if (isMentor) {
        checkMentorStatus();
      }
    }
  }, [profile, isMentor]);

  const checkMentorStatus = async () => {
    if (!user) return;
    
    try {
      console.log("Checking mentor status for:", user.id);
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error checking mentor status:', error);
        }
        setIsMentorProfile(false);
        return;
      }
      
      if (data) {
        console.log("Mentor data found:", data);
        setIsMentorProfile(true);
        setMentorData(data);
        // Update form with mentor data
        setFormData(prev => ({
          ...prev,
          bio: data.bio || "",
          department: data.department || "",
          skills: data.skills?.join(', ') || "",
          linkedin_url: data.linkedin_url || "",
          profile_image: data.profile_image || prev.profile_image
        }));
      }
    } catch (error) {
      console.error('Error checking mentor status:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !user) return null;
    
    const fileExt = imageFile.name.split('.').pop();
    const filePath = `profile-images/${user.id}-${Date.now()}.${fileExt}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, imageFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    }
  };

  const handleRefreshProfile = async () => {
    toast.info("Refreshing profile data...");
    await refreshProfile();
    toast.success("Profile data refreshed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to update your profile');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload image if changed
      let profileImageUrl = formData.profile_image;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          profileImageUrl = uploadedUrl;
        }
      }
      
      console.log("Updating user profile with data:", {
        name: formData.name,
        profile_image: profileImageUrl
      });
      
      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          profile_image: profileImageUrl
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // If mentor, update mentor profile as well
      if (isMentorProfile) {
        const skillsArray = formData.skills
          .split(',')
          .map(skill => skill.trim())
          .filter(skill => skill.length > 0);
        
        console.log("Updating mentor profile with data:", {
          name: formData.name,
          bio: formData.bio,
          department: formData.department,
          skills: skillsArray,
          linkedin_url: formData.linkedin_url,
          profile_image: profileImageUrl
        });
        
        const { error: mentorError } = await supabase
          .from('mentors')
          .update({
            name: formData.name,
            bio: formData.bio,
            department: formData.department,
            skills: skillsArray,
            linkedin_url: formData.linkedin_url,
            profile_image: profileImageUrl
          })
          .eq('id', user.id);
        
        if (mentorError) throw mentorError;
      }
      
      toast.success('Profile updated successfully');
      
      // Refresh the profile to show updated data
      await refreshProfile();
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 md:px-6 pt-24 pb-16 flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-16 md:py-24 mx-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl font-bold">Your Profile</h1>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefreshProfile} 
                title="Refresh profile data"
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-2">
              {isMentor 
                ? "You're registered as a mentor. Edit your profile details below." 
                : "Manage your account information"}
            </p>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6 md:p-8 border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={previewUrl || formData.profile_image} alt={formData.name} />
                    <AvatarFallback>{formData.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      type="file"
                      id="profile-image"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Click the camera icon to upload a new photo
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              {/* Only show these fields for mentors */}
              {isMentorProfile && (
                <>
                  <div>
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
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="skills">Skills (comma separated)</Label>
                      <Input
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="Python, Data Structures, Machine Learning"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      name="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                </>
              )}
              
              {(!isMentorProfile && !isMentor) ? (
                <div className="py-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Want to help other students? Apply to become a mentor!
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/become-mentor')}
                  >
                    Become a Mentor
                  </Button>
                </div>
              ) : null}
              
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
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

export default UserProfile;
