
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MentorProfileForm from "@/components/mentors/MentorProfileForm";
import { canEditApplication } from "@/integrations/supabase/services/mentor-verification";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, FileText } from "lucide-react";

const BecomeMentor = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [editMode, setEditMode] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const editParam = searchParams.get('edit');

  const initialFormData = {
    name: profile?.name || "",
    department: "",
    skills: "",
    bio: "",
    linkedin_url: "",
    profile_image: profile?.profile_image || "",
    cgpa: "",
    year_of_studies: "",
    university: "",
    hobbies: "",
    mobile: ""
  };

  useEffect(() => {
    if (user && editParam === 'true') {
      checkEditEligibility();
    } else {
      setLoading(false);
    }
  }, [user, editParam]);

  const checkEditEligibility = async () => {
    try {
      const result = await canEditApplication(user.id);
      
      if (result.canEdit && result.application) {
        setEditMode(true);
        setExistingApplication(result.application);
      } else if (result.application && result.application.status !== 'rejected') {
        toast.error("You can only edit rejected applications");
      } else {
        toast.error("No rejected application found to edit");
      }
    } catch (error: any) {
      console.error('Error checking edit eligibility:', error);
      toast.error('Failed to check application status');
    } finally {
      setLoading(false);
    }
  };

  const getFormDataFromApplication = () => {
    if (!existingApplication) return initialFormData;
    
    const appData = existingApplication.application_data || {};
    return {
      name: appData.name || profile?.name || "",
      department: appData.department || "",
      skills: appData.skills || "",
      bio: appData.bio || "",
      linkedin_url: appData.linkedin_url || "",
      profile_image: appData.profile_image || profile?.profile_image || "",
      cgpa: existingApplication.cgpa?.toString() || "",
      year_of_studies: existingApplication.year_of_studies || "",
      university: existingApplication.university || "",
      hobbies: existingApplication.hobbies || "",
      mobile: appData.mobile || ""
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to continue</h2>
          <p className="text-muted-foreground">You need to be logged in to become a mentor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {editMode && existingApplication ? (
        <div className="container mx-auto px-4 py-8">
          {/* Edit Mode Header */}
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
                <Edit className="h-5 w-5" />
                <span>Edit Mentor Application</span>
                <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                  Previously Rejected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-amber-700 dark:text-amber-300">
                    Your previous mentor application was rejected. You can now make changes and resubmit your application.
                  </p>
                  {existingApplication.rejection_reason && (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        Admin Feedback:
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {existingApplication.rejection_reason}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Make the necessary changes based on the feedback above and resubmit your application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <MentorProfileForm 
            userId={user.id}
            initialData={getFormDataFromApplication()}
            isEditMode={true}
            pageTitle="Update Mentor Application"
          />
        </div>
      ) : (
        <MentorProfileForm 
          userId={user.id}
          initialData={initialFormData}
          isEditMode={false}
        />
      )}
    </div>
  );
};

export default BecomeMentor;
