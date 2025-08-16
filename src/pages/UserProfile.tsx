
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Save, AlertTriangle, Edit, Clock } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AcademicInfoSection from "@/components/profile/AcademicInfoSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMentorProfile, setIsMentorProfile] = useState(false);
  const [isApprovedMentor, setIsApprovedMentor] = useState(false);
  const [mentorData, setMentorData] = useState<any>(null);
  const [mentorVerification, setMentorVerification] = useState<any>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profile_image: "",
    bio: "",
    department: "",
    skills: "",
    linkedin_url: "",
    cgpa: "",
    year_of_studies: "",
    university: "",
    hobbies: "",
    mobile: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.name || "",
        email: profile.email || "",
        profile_image: profile.profile_image || "",
        mobile: profile.mobile || ""
      }));

      // Check if the user is a mentor
      checkMentorStatus();
      // Check mentor verification status
      checkMentorVerification();
    }
  }, [profile]);

  const checkMentorVerification = async () => {
    if (!user) return;
    
    try {
      setVerificationLoading(true);
      const { data } = await getMentorVerification(user.id);
      setMentorVerification(data);
    } catch (error) {
      console.error('Error checking mentor verification:', error);
    } finally {
      setVerificationLoading(false);
    }
  };

  const checkMentorStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Error checking mentor status:', error);
        }
        setIsMentorProfile(false);
        setIsApprovedMentor(false);
        return;
      }
      
      if (data) {
        setIsMentorProfile(true);
        setMentorData(data);
        
        // Check if this is an approved mentor (not in General department)
        const isApproved = data && 
          data.department && 
          data.department !== 'General';
        
        setIsApprovedMentor(isApproved);
        
        // Update form with mentor data including academic fields
        setFormData(prev => ({
          ...prev,
          bio: data.bio || "",
          department: data.department || "",
          skills: data.skills?.join(', ') || "",
          linkedin_url: data.linkedin_url || "",
          profile_image: data.profile_image || prev.profile_image,
          cgpa: data.cgpa?.toString() || "",
          year_of_studies: data.year_of_studies || "",
          university: data.university || "",
          hobbies: data.hobbies || "",
          mobile: data.mobile || ""
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

  const handleSelectChange = (name: string, value: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast.error('User profile not loaded');
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
      
      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          profile_image: profileImageUrl,
          mobile: formData.mobile
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // If mentor, update mentor profile as well
      if (isMentorProfile) {
        const skillsArray = formData.skills
          .split(',')
          .map(skill => skill.trim())
          .filter(skill => skill.length > 0);
        
        const updateData: any = {
          name: formData.name,
          bio: formData.bio,
          department: formData.department,
          skills: skillsArray,
          linkedin_url: formData.linkedin_url,
          profile_image: profileImageUrl,
          mobile: formData.mobile
        };

        // Add academic fields for approved mentors
        if (isApprovedMentor) {
          updateData.cgpa = formData.cgpa ? parseFloat(formData.cgpa) : null;
          updateData.year_of_studies = formData.year_of_studies || null;
          updateData.university = formData.university || null;
          updateData.hobbies = formData.hobbies || null;
        }
        
        const { error: mentorError } = await supabase
          .from('mentors')
          .update(updateData)
          .eq('id', user.id);
        
        if (mentorError) throw mentorError;
      }
      
      toast.success('Profile updated successfully');
      // Refresh the page to show updated profile
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMentorApplicationStatus = () => {
    if (verificationLoading) return null;
    
    if (!mentorVerification) {
      return (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Become a Mentor</h3>
                <p className="text-sm text-muted-foreground">Share your knowledge and help other students</p>
              </div>
              <Button onClick={() => navigate('/become-mentor')}>
                Apply Now
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'pending':
          return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
        case 'approved':
          return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>;
        case 'rejected':
          return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Needs Attention</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    };

    return (
      <Card className={`mb-6 ${mentorVerification.status === 'rejected' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span>Mentor Application Status</span>
              {getStatusBadge(mentorVerification.status)}
            </span>
            {mentorVerification.status === 'rejected' && (
              <Button 
                onClick={() => navigate('/become-mentor?edit=true')}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit & Resubmit</span>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mentorVerification.status === 'pending' && (
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm">Your mentor application is currently under review by our team.</p>
                <p className="text-xs text-muted-foreground mt-1">You will be notified once the review is complete.</p>
              </div>
            </div>
          )}
          
          {mentorVerification.status === 'approved' && (
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
              </div>
              <div>
                <p className="text-sm">Congratulations! Your mentor application has been approved.</p>
                <p className="text-xs text-muted-foreground mt-1">You can now help other students as a verified mentor.</p>
              </div>
            </div>
          )}
          
          {mentorVerification.status === 'rejected' && (
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your mentor application needs some updates before it can be approved.
                </p>
                {mentorVerification.rejection_reason && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Admin Feedback:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {mentorVerification.rejection_reason}
                    </p>
                  </div>
                )}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>Good news:</strong> Your previous information has been saved. Click "Edit & Resubmit" to make the necessary changes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (authLoading || verificationLoading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-16 md:py-24 mx-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
            <p className="text-muted-foreground mt-2">
              {isApprovedMentor 
                ? "You're registered as a mentor. Edit your profile details below." 
                : isMentorProfile 
                ? "Complete your profile below. To become a mentor, click 'Become a Mentor'."
                : "Manage your account information"
              }
            </p>
          </div>
          
          {renderMentorApplicationStatus()}
          
          <div className="bg-card rounded-lg shadow-sm p-6 md:p-8 border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={previewUrl || formData.profile_image} alt={formData.name} />
                    <AvatarFallback>{formData.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
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
                  <Label htmlFor="name" className="text-foreground">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-foreground">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="bg-muted text-muted-foreground border-border"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="mobile" className="text-foreground">Mobile Number</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="Enter your mobile number"
                    className="bg-background text-foreground border-border placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              
              {/* Only show these fields for approved mentors */}
              {isApprovedMentor && (
                <>
                  <div>
                    <Label htmlFor="bio" className="text-foreground">About</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Tell students about yourself, your experience, and how you can help them"
                      className="bg-background text-foreground border-border placeholder:text-muted-foreground"
                    />
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="department" className="text-foreground">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="bg-background text-foreground border-border"
                      />
                    </div>
                    <div>
                      <Label htmlFor="skills" className="text-foreground">Skills (comma separated)</Label>
                      <Input
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder="Python, Data Structures, Machine Learning"
                        className="bg-background text-foreground border-border placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="linkedin_url" className="text-foreground">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      name="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="bg-background text-foreground border-border placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Academic Information Section */}
                  <AcademicInfoSection 
                    formData={{
                      cgpa: formData.cgpa,
                      year_of_studies: formData.year_of_studies,
                      university: formData.university,
                      hobbies: formData.hobbies
                    }}
                    handleChange={handleChange}
                    handleSelectChange={handleSelectChange}
                  />
                </>
              )}
              
              {!isApprovedMentor && !mentorVerification && (
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
              )}
              
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
