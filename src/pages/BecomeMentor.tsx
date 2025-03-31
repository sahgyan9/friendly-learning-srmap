
import React from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import MentorProfileForm from "@/components/mentors/MentorProfileForm";
import MentorFormHeader from "@/components/mentors/MentorFormHeader";

const BecomeMentor = () => {
  const { user, profile } = useAuth();
  
  const initialFormData = {
    name: profile?.name || "",
    department: "",
    skills: "",
    bio: "",
    linkedin_url: "",
    profile_image: profile?.profile_image || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container px-4 py-16 md:py-24 mx-auto">
        <div className="max-w-3xl mx-auto">
          <MentorFormHeader />
          
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            {user ? (
              <MentorProfileForm 
                userId={user.id} 
                initialData={initialFormData}
              />
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
