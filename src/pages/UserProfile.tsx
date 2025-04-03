
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useProfileForm } from "@/hooks/profile/useProfileForm";

// Import refactored components
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";
import BasicProfileForm from "@/components/profile/BasicProfileForm";
import MentorProfileForm from "@/components/profile/MentorProfileForm";
import BecomeMentorButton from "@/components/profile/BecomeMentorButton";
import ProfileFormActions from "@/components/profile/ProfileFormActions";

const UserProfile = () => {
  const navigate = useNavigate();
  const { 
    user,
    authLoading,
    formData,
    isLoading,
    isMentorProfile,
    isMentor,
    previewUrl,
    handleChange,
    handleImageChange,
    handleRefreshProfile,
    handleSubmit
  } = useProfileForm();

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
          <ProfileHeader 
            onRefresh={handleRefreshProfile} 
            isMentor={isMentor}
          />
          
          <div className="bg-card rounded-lg shadow-sm p-6 md:p-8 border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              <ProfileImageUpload
                profileImage={previewUrl || formData.profile_image}
                name={formData.name}
                onImageChange={handleImageChange}
              />
              
              <BasicProfileForm
                name={formData.name}
                email={formData.email}
                onChange={handleChange}
              />
              
              {/* Only show these fields for mentors */}
              {isMentorProfile && (
                <MentorProfileForm
                  bio={formData.bio}
                  department={formData.department}
                  skills={formData.skills}
                  linkedin_url={formData.linkedin_url}
                  onChange={handleChange}
                />
              )}
              
              {(!isMentorProfile && !isMentor) && <BecomeMentorButton />}
              
              <ProfileFormActions isLoading={isLoading} />
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
