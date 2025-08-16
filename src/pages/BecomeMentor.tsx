
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MentorProfileForm from "@/components/mentors/MentorProfileForm";
import MentorFormHeader from "@/components/mentors/MentorFormHeader";
import { canEditApplication } from "@/integrations/supabase/services/mentor-verification";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";

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
    if (user) {
      checkApplicationStatus();
    } else {
      setLoading(false);
    }
  }, [user, editParam]);

  const checkApplicationStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await canEditApplication(user.id);

      if (result.application) {
        // User has an existing application
        setExistingApplication(result.application);

        if (editParam === 'true') {
          // User wants to edit, check if they can
          if (result.canEdit) {
            setEditMode(true);
          } else {
            // Application is not rejected, redirect them based on status
            if (result.application.status === 'pending') {
              toast.info("Your application is currently under review. You cannot edit it at this time.");
            } else if (result.application.status === 'approved') {
              toast.info("Your mentor application is already approved!");
            }
            // Don't set edit mode, but show the application status
          }
        } else {
          // User is visiting normally, show appropriate interface based on status
          if (result.application.status === 'pending') {
            // Show status message instead of form
            setEditMode(false);
          } else if (result.application.status === 'approved') {
            // Show success message
            setEditMode(false);
          } else if (result.application.status === 'rejected') {
            // Show option to edit
            setEditMode(false);
          }
        }
      } else {
        // No existing application, show new application form
        setEditMode(false);
        setExistingApplication(null);
      }
    } catch (error: any) {
      console.error('Error checking application status:', error);
      toast.error('Failed to check application status');
    } finally {
      setLoading(false);
    }
  };

  const renderApplicationStatusCard = (application: any) => {
    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'pending':
          return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Under Review</Badge>;
        case 'approved':
          return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">Approved</Badge>;
        case 'rejected':
          return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">Needs Updates</Badge>;
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    };

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Your Mentor Application</span>
              {getStatusBadge(application.status)}
            </span>
            {application.status === 'rejected' && (
              <Button
                onClick={() => window.location.href = '/become-mentor?edit=true'}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit & Resubmit</span>
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {application.status === 'pending' && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Your mentor application is currently being reviewed by our team. You will be notified once the review is complete.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Application Details:</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p><strong>Submitted:</strong> {new Date(application.submitted_at).toLocaleDateString()}</p>
                  <p><strong>University:</strong> {application.university}</p>
                  <p><strong>Department:</strong> {application.application_data?.department || 'N/A'}</p>
                  <p><strong>CGPA:</strong> {application.cgpa}</p>
                </div>
              </div>
            </div>
          )}

          {application.status === 'approved' && (
            <div className="space-y-3">
              <p className="text-green-700 dark:text-green-300">
                🎉 Congratulations! Your mentor application has been approved. You can now help other students as a verified mentor.
              </p>
              <Button onClick={() => window.location.href = '/profile'}>
                View Your Mentor Profile
              </Button>
            </div>
          )}

          {application.status === 'rejected' && (
            <div className="space-y-3">
              <p className="text-amber-700 dark:text-amber-300">
                Your mentor application needs some updates before it can be approved.
              </p>
              {application.rejection_reason && (
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Admin Feedback:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {application.rejection_reason}
                  </p>
                </div>
              )}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 <strong>Good news:</strong> Your previous information has been saved. Click "Edit & Resubmit" to make the necessary changes.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please sign in to continue</h2>
            <p className="text-muted-foreground">You need to be logged in to become a mentor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16 md:py-24">
        {/* Show existing application status if not in edit mode and has application */}
        {!editMode && existingApplication && editParam !== 'true' ? (
          <div className="max-w-4xl mx-auto">
            <MentorFormHeader
              title="Mentor Application Status"
              description="Check the status of your mentor application below."
            />
            {renderApplicationStatusCard(existingApplication)}
          </div>
        ) : editMode && existingApplication ? (
          <>
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

            <MentorFormHeader
              title="Update Mentor Application"
              description="Make the necessary changes based on the admin feedback and resubmit your application."
            />

            <div className="max-w-4xl mx-auto">
              <MentorProfileForm
                userId={user.id}
                initialData={getFormDataFromApplication()}
                isEditMode={true}
                pageTitle="Update Mentor Application"
              />
            </div>
          </>
        ) : (
          <>
            {/* New Application Mode */}
            <MentorFormHeader />
            <div className="max-w-4xl mx-auto">
              <MentorProfileForm
                userId={user.id}
                initialData={initialFormData}
                isEditMode={false}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BecomeMentor;
