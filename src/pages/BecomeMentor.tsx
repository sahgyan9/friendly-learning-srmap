
import { useAuth } from "@/context/AuthContext";
import { MentorProfileForm } from "@/components/mentors/MentorProfileForm";
import { useMentorForm } from "@/hooks/useMentorForm";

const BecomeMentor = () => {
  const { user } = useAuth();

  const initialFormData = {
    name: user?.name || "",
    department: "",
    skills: "",
    bio: "",
    linkedin_url: "",
    profile_image: user?.profile_image || "",
    cgpa: "",
    year_of_studies: "",
    university: "",
    hobbies: "",
    mobile: ""
  };

  const mentorForm = useMentorForm(user?.id || "", initialFormData);

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
      <MentorProfileForm {...mentorForm} />
    </div>
  );
};

export default BecomeMentor;
