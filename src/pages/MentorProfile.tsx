
import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowLeft, Linkedin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [mentor, setMentor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMentor = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('mentors')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setMentor(data);
      } catch (error: any) {
        console.error("Error fetching mentor:", error);
        toast({
          title: "Error",
          description: "Failed to load mentor profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchMentor();
    }
  }, [id, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container px-4 py-24 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-12 w-48 bg-gray-200 rounded mx-auto mb-4"></div>
            <div className="h-6 w-32 bg-gray-200 rounded mx-auto"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container px-4 py-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Mentor Not Found</h2>
            <p className="text-muted-foreground mb-6">The mentor you're looking for doesn't exist or has been removed.</p>
            <Button asChild>
              <Link to="/mentors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Mentors
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container px-4 py-24">
        <Button variant="outline" asChild className="mb-8">
          <Link to="/mentors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Mentors
          </Link>
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left column - Profile info */}
          <div className="col-span-1">
            <div className="flex flex-col items-center text-center">
              <img
                src={mentor.profile_image}
                alt={mentor.name}
                className="w-32 h-32 rounded-full object-cover border-2 border-white shadow-md mb-4"
              />
              <h1 className="text-2xl font-bold mb-1">{mentor.name}</h1>
              <p className="text-muted-foreground mb-3">{mentor.department}</p>
              
              <div className="flex items-center mb-4">
                <Star className="w-5 h-5 text-yellow-400 mr-1" />
                <span className="font-medium">{mentor.rating.toFixed(1)}</span>
                <span className="text-muted-foreground ml-1">({mentor.review_count} reviews)</span>
              </div>
              
              {mentor.linkedin_url && (
                <Button variant="outline" className="gap-2" asChild>
                  <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Profile
                  </a>
                </Button>
              )}
            </div>
          </div>
          
          {/* Right column - Skills and Bio */}
          <div className="col-span-1 md:col-span-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {mentor.skills.map((skill: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h2 className="text-xl font-semibold mb-3">About</h2>
                <p className="text-muted-foreground">{mentor.bio}</p>
              </div>
              
              <Separator />
              
              <div>
                <Button className="w-full">Connect with {mentor.name.split(' ')[0]}</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MentorProfile;
