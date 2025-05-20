
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import TeamMembers from "@/components/about/TeamMembers";

const About = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-6">About Friendly Learning</h1>
            
            <p className="text-lg mb-6">
              Friendly Learning is a peer-to-peer mentorship platform designed to connect students 
              with experienced mentors who can help them excel in their academic journey.
            </p>
            
            <p className="text-lg mb-6">
              Our mission is to create a collaborative learning environment where knowledge is 
              shared freely, and everyone has access to the support they need to succeed.
            </p>
            
            <h2 className="text-2xl font-semibold mt-10 mb-4">Our Story</h2>
            <p className="mb-6">
              Friendly Learning was founded by a group of students who recognized the value of 
              peer mentorship in their own academic success. They created this platform to 
              formalize and expand the reach of student-to-student mentoring.
            </p>
            
            <h2 className="text-2xl font-semibold mt-10 mb-4">Join Our Community</h2>
            <p className="mb-6">
              Whether you're looking for help or want to share your knowledge, 
              Friendly Learning has a place for you.
            </p>
            
            <div className="mt-8 mb-12">
              <Button asChild size="lg">
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
          
          <div className="mt-16">
            <TeamMembers />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
