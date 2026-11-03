
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MentorProfileForm from "@/components/mentors/MentorProfileForm";
import MentorFormHeader from "@/components/mentors/MentorFormHeader";
import MentorWelcome from "@/components/mentors/MentorWelcome";
import { getMentorVerification, canEditApplication } from "@/integrations/supabase/services/mentor-verification";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Edit, FileText, Clock, CheckCircle, XCircle, Info, Loader2 } from "lucide-react";
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
          badge: <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800">Under review</Badge>,
          title: "Application under review",
          description: "Your mentor application is being reviewed.",
          cardClass: "border-amber-200 bg-amber-50 dark:bg-amber-900/20"
        };
      case 'approved':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          badge: <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-200 dark:border-green-800">Live</Badge>,
          title: "You're a mentor",
          description: "Your profile is live. Students can find you in the mentor list and message you.",
          cardClass: "border-green-200 bg-green-50 dark:bg-green-900/20"
        };
      case 'rejected':
        return {
          icon: <XCircle className="h-6 w-6 text-red-600" />,
          badge: <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800">Needs changes</Badge>,
          title: "Application needs changes",
          description: "Your mentor application needs changes before it can be approved.",
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
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-semibold tracking-tight">Sign in to continue</h1>
            <p className="text-muted-foreground">You need an account to become a mentor.</p>
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
              <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {existingApplication.status === 'approved' ? 'Your mentor profile' : 'Mentor application status'}
              </h1>
              <p className="text-muted-foreground">
                {existingApplication.status === 'approved'
                  ? "You are listed as a mentor at SRM AP."
                  : "The current status of your mentor application."}
              </p>
            </div>

            <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 shrink-0 [&_svg]:h-5 [&_svg]:w-5">{statusDisplay?.icon}</span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight">{statusDisplay?.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{statusDisplay?.description}</p>
                  </div>
                </div>
                <span className="shrink-0">{statusDisplay?.badge}</span>
              </div>

              <div className="mt-5 border-t border-border pt-5">
                {existingApplication.status === 'pending' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Submitted on <span className="tabular text-foreground">{new Date(existingApplication.submitted_at).toLocaleDateString()}</span>.
                      You will be notified when it has been reviewed.
                    </p>
                    <Button onClick={() => navigate('/profile')} variant="outline">
                      <FileText />
                      Account settings
                    </Button>
                  </div>
                )}

                {existingApplication.status === 'approved' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Students and peers can find you in search, browse your skills, and message you.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => navigate(`/mentor/${user.id}`)}>
                        View public profile
                      </Button>
                      <Button onClick={() => navigate('/profile')} variant="outline">
                        Edit settings
                      </Button>
                    </div>
                  </div>
                )}

                {existingApplication.status === 'rejected' && (
                  <div className="space-y-4">
                    {existingApplication.rejection_reason && (
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs font-medium text-muted-foreground">Feedback from the reviewer</p>
                        <p className="mt-1 text-sm text-foreground">{existingApplication.rejection_reason}</p>
                      </div>
                    )}
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      Your previous answers are saved, so you only need to change what the feedback asks for.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setEditMode(true)}>
                        <Edit />
                        Edit and resubmit
                      </Button>
                      <Button onClick={() => navigate('/profile')} variant="outline">
                        View profile
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
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
          <div className="mx-auto mb-6 max-w-4xl rounded-xl border border-amber-500/40 bg-amber-50 p-5 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 space-y-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Your previous application was not approved</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Change what the reviewer asked for below and resubmit.
                  </p>
                </div>
                {existingApplication.rejection_reason && (
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs font-medium text-muted-foreground">Feedback from the reviewer</p>
                    <p className="mt-1 text-sm text-foreground">{existingApplication.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <MentorFormHeader 
            title="Update your mentor application"
            description="Edit your answers and resubmit for review."
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
