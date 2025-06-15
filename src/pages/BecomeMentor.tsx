
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import MentorProfileForm from "@/components/mentors/MentorProfileForm";
import MentorFormHeader from "@/components/mentors/MentorFormHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { getMentorVerification } from "@/integrations/supabase/services/mentor-verification";

const BecomeMentor = () => {
  const { user, profile } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initialFormData = {
    name: profile?.name || "",
    department: "",
    skills: "",
    bio: "",
    linkedin_url: "",
    profile_image: profile?.profile_image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
  };

  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await getMentorVerification(user.id);
        if (data) {
          setVerificationStatus(data.status);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkVerificationStatus();
  }, [user]);

  const getStatusAlert = () => {
    switch (verificationStatus) {
      case 'pending':
        return (
          <Alert className="mb-6">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Your mentor application is currently under review. You will be notified once our team has processed your application.
            </AlertDescription>
          </Alert>
        );
      case 'approved':
        return (
          <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Congratulations! Your mentor application has been approved. You can now mentor students and update your profile.
            </AlertDescription>
          </Alert>
        );
      case 'rejected':
        return (
          <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your mentor application needs attention. Please contact support or resubmit your application with the required changes.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container px-4 py-16 md:py-24 mx-auto">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3">Loading...</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container px-4 py-16 md:py-24 mx-auto">
        <div className="max-w-3xl mx-auto">
          <MentorFormHeader 
            title="Become a Mentor"
            description="Share your knowledge and help other students excel in their academic journey."
          />
          
          {getStatusAlert()}
          
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            {user ? (
              <>
                {verificationStatus === 'pending' ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-12 w-12 text-yellow-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Application Under Review</h3>
                      <p className="text-center text-muted-foreground">
                        Your mentor application is being reviewed by our team. We'll notify you once a decision has been made.
                      </p>
                    </CardContent>
                  </Card>
                ) : verificationStatus === 'approved' ? (
                  <div>
                    <p className="text-center text-muted-foreground mb-6">
                      You are an approved mentor! You can update your mentor profile below.
                    </p>
                    <MentorProfileForm 
                      userId={user.id} 
                      initialData={initialFormData}
                    />
                  </div>
                ) : (
                  <MentorProfileForm 
                    userId={user.id} 
                    initialData={initialFormData}
                  />
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">
                Please sign in to create a mentor profile.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BecomeMentor;
