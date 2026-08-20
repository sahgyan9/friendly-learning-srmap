
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MentorProfileForm from "@/components/mentors/MentorProfileForm";
import MentorFormHeader from "@/components/mentors/MentorFormHeader";
import MentorWelcome from "@/components/mentors/MentorWelcome";
import { getMentorVerification, canEditApplication } from "@/integrations/supabase/services/mentor-verification";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BecomeMentor = () => {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Whether the applicant has moved past the welcome screen. Landing straight on
   * ten fields is what turned people away, so the form is now something you opt
   * into after reading what it's for.
   */
  const [started, setStarted] = useState(false);

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
    college_id: "",
    // Suggested from the College ID once it is entered, then confirmed.
    graduation_year: "",
    // Every mentor on this platform is an SRM AP student, so asking them to type
    // it out was pure friction — it stays editable for the rare exception.
    university: "SRM University AP",
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
    try {
      const { data } = await getMentorVerification(user.id);
      
      if (data) {
        setExistingApplication(data);
        
        // Handle edit mode for rejected applications
        if (editParam === 'true' && data.status === 'rejected') {
          setEditMode(true);
        } else if (editParam === 'true' && data.status !== 'rejected') {
          toast.error("You can only edit rejected applications");
        }
      }
    } catch (error: unknown) {
      console.error('Error checking application status:', error);
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
      college_id: existingApplication.college_id || "",
      graduation_year: existingApplication.graduation_year?.toString() || "",
      university: existingApplication.university || "",
      hobbies: existingApplication.hobbies || "",
      mobile: appData.mobile || ""
    };
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-6 w-6 text-amber-600" />,
          badge: <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">Under Review</Badge>,
          title: "Application Under Review",
          description: "Your mentor application is currently being reviewed by our team.",
          cardClass: "border-amber-200 bg-amber-50 dark:bg-amber-900/20"
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          badge: <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-200 dark:border-green-800">Live</Badge>,
          title: "You're a mentor 🎉",
          description: "Your profile is live. Students can find you in the mentor list and message you.",
          cardClass: "border-green-200 bg-green-50 dark:bg-green-900/20"
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-6 w-6 text-red-600" />,
          badge: <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800">Needs Attention</Badge>,
          title: "Application Needs Updates",
          description: "Your mentor application needs some improvements before it can be approved.",
          cardClass: "border-red-200 bg-red-50 dark:bg-red-900/20"
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please sign in to continue</h2>
            <p className="text-muted-foreground">You need to be logged in to become a mentor.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show existing application status if not in edit mode
  if (existingApplication && !editMode) {
    const statusDisplay = getStatusDisplay(existingApplication.status);
    
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto">
            {/* An approved mentor lands here straight after submitting and every
                time afterwards. Heading it "Application Status" told someone who
                is already listed that they were still in a queue. */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-4">
                {existingApplication.status === 'approved' ? 'Your mentor profile' : 'Mentor application status'}
              </h1>
              <p className="text-muted-foreground">
                {existingApplication.status === 'approved'
                  ? "You're listed as a mentor at SRM AP"
                  : "Here's the current status of your mentor application"}
              </p>
            </div>

            <Card className={`mb-6 ${statusDisplay?.cardClass}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-3">
                    {statusDisplay?.icon}
                    <div>
                      <h3 className="text-xl font-semibold">{statusDisplay?.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{statusDisplay?.description}</p>
                    </div>
                  </span>
                  {statusDisplay?.badge}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {existingApplication.status === 'pending' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Your application was submitted on {new Date(existingApplication.submitted_at).toLocaleDateString()}. 
                        Our team will review it carefully and get back to you soon.
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <Button onClick={() => navigate('/profile')} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                )}

                {existingApplication.status === 'approved' && (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Nothing else to do — students browsing for help can see you already. You can
                        edit your profile whenever you like.
                      </p>
                    </div>
                    <div className="flex justify-center space-x-4">
                      <Button onClick={() => navigate('/profile')}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Mentor Profile
                      </Button>
                      <Button onClick={() => navigate('/mentors')} variant="outline">
                        Browse Mentors
                      </Button>
                    </div>
                  </div>
                )}

                {existingApplication.status === 'rejected' && (
                  <div className="space-y-4">
                    {existingApplication.rejection_reason && (
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Admin Feedback:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {existingApplication.rejection_reason}
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 <strong>Good news:</strong> Your previous information has been saved. You can edit your application and make the suggested improvements.
                      </p>
                    </div>

                    <div className="flex justify-center space-x-4">
                      <Button onClick={() => setEditMode(true)} size="lg">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit & Resubmit Application
                      </Button>
                      <Button onClick={() => navigate('/profile')} variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show edit form for rejected applications
  if (editMode && existingApplication && existingApplication.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
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
        </div>
      </div>
    );
  }

  // Show new application form (only if no existing application)
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 md:py-24">
        {started ? (
          <>
            <MentorFormHeader
              title="Set up your mentor profile"
              description="Three short steps. Your profile is live the moment you finish."
            />
            <div className="max-w-4xl mx-auto">
              <MentorProfileForm
                userId={user.id}
                initialData={initialFormData}
                isEditMode={false}
              />
            </div>
          </>
        ) : (
          <MentorWelcome
            name={profile?.name || ""}
            onStart={() => {
              setStarted(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onLeave={() => navigate("/")}
          />
        )}
      </div>
    </div>
  );
};

export default BecomeMentor;
