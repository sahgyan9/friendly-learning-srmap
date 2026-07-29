import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import TeamMembers from "@/components/about/TeamMembers";
import StructuredData from "@/components/StructuredData";
import { getOrganizationSchema } from "@/lib/structured-data";
import { getTeamMembers, TeamMember } from "@/integrations/supabase/services/team-members";

const About = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await getTeamMembers();
      if (data) setTeamMembers(data);
    };
    load();
  }, []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Friendly Learning SRMAP",
    "description": "Learn about Friendly Learning SRMAP, the university student collaboration platform for finding study partners, hackathon teams, and project collaborators",
    "mainEntity": {
      "@type": "Organization",
      "name": "Friendly Learning SRMAP",
      "description": "University student collaboration platform connecting students for academic help, hackathon partnerships, project collaborations, startup discussions, and finding study partners with specific skills",
      "foundingDate": "2024",
      "serviceArea": "Universities Worldwide",
      "mission": "To build the strongest university communities by connecting students with each other for academic success, project collaboration, and personal growth",
      "services": [
        "Academic Help and Tutoring",
        "Hackathon Team Formation",
        "Project Collaboration",
        "Startup Team Building",
        "Study Partner Matching",
        "Skill-based Student Discovery",
        "University Community Posts"
      ],
      ...(teamMembers.length > 0 && {
        "member": teamMembers.map(m => ({
          "@type": "Person",
          "name": m.name,
          "jobTitle": m.position,
          ...(m.email && { "email": m.email }),
          ...(m.image_url && { "image": m.image_url })
        })),
        "founder": teamMembers.filter(m => 
          m.position.toLowerCase().includes('founder') || 
          m.position.toLowerCase().includes('lead') ||
          m.position.toLowerCase().includes('ceo')
        ).map(m => ({
          "@type": "Person",
          "name": m.name,
          "jobTitle": m.position,
          ...(m.image_url && { "image": m.image_url })
        }))
      })
    }
  };

  return (
    <>
      <SEOHead
        title="About Friendly Learning SRMAP - University Student Collaboration Platform | Find Study Partners & Hackathon Teams"
        description="Learn about Friendly Learning SRMAP's mission to connect university students for academic help, hackathon partnerships, project collaborations, startup discussions, and finding study partners. Discover how our platform builds stronger university communities."
        keywords="about Friendly Learning SRMAP, university student collaboration, find hackathon partners, student project collaboration, university community platform, study partner matching, startup team formation, skill-based student discovery"
        canonical={`${PRIMARY_DOMAIN}/about`}
      />

      {/* Add structured data using our dedicated component */}
      <StructuredData data={structuredData} />
      <StructuredData data={getOrganizationSchema()} />

      <div className="min-h-screen">
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <header>
                <h1 className="text-4xl font-bold mb-6">About Friendly Learning SRMAP</h1>
              </header>
              <section className="mb-8">
                <p className="text-lg mb-6">
                  <strong>Friendly Learning SRMAP</strong> is a university student collaboration platform that connects students within the same university for various academic and project-based needs. Whether you need academic help, looking for hackathon partners, seeking project collaborators, or want to find like-minded peers for startups - Friendly Learning SRMAP brings the university community together.
                </p>
                <p className="text-lg mb-6">
                  Our platform eliminates the traditional barriers of finding the right people within your university. Instead of wondering who might have the skills you need or share your interests, Friendly Learning SRMAP helps you discover and connect with fellow students who can help you succeed.
                </p>
                <p className="text-lg mb-6">
                  <strong>FL stands for Friendly Learning</strong> — emphasizing our commitment to creating a collaborative environment where students support each other's academic and professional growth within their university community.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-6">What You Can Do on Friendly Learning SRMAP</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 border rounded-lg">
                    <div className="text-4xl mb-4">🤝</div>
                    <h3 className="text-xl font-bold mb-3">Get Academic Help</h3>
                    <p>Connect with fellow students for academic guidance, study sessions, assignment help, or clarifying concepts. Find students who excel in subjects you're struggling with.</p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-xl font-bold mb-3">Community Posts</h3>
                    <p>Post your problems, questions, or requests in the community. Get responses from university students and arrange one-on-one meetings for detailed discussions.</p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <div className="text-4xl mb-4">💻</div>
                    <h3 className="text-xl font-bold mb-3">Find Hackathon Partners</h3>
                    <p>Looking for a hackathon team? Find students with complementary skills like coding, design, or business development to form the perfect team for competitions.</p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <div className="text-4xl mb-4">🚀</div>
                    <h3 className="text-xl font-bold mb-3">Project Collaboration</h3>
                    <p>Working on a project or planning a startup? Discover students with specific technical skills, domain expertise, or shared entrepreneurial interests within your university.</p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <div className="text-4xl mb-4">🎯</div>
                    <h3 className="text-xl font-bold mb-3">Interest-Based Connections</h3>
                    <p>Find students who share your hobbies, interests, or career aspirations. Build friendships and networks that extend beyond academics.</p>
                  </div>
                  <div className="p-6 border rounded-lg">
                    <div className="text-4xl mb-4">⭐</div>
                    <h3 className="text-xl font-bold mb-3">Skill-Based Matching</h3>
                    <p>Search for students based on specific skills, expertise, or academic strengths. Whether it's programming languages, research areas, or creative skills - find the right match.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-lg mb-6">
                  To build the strongest university communities by connecting students with each other for academic success, project collaboration, and personal growth. We believe that the best help often comes from fellow students who understand your challenges and can provide peer-to-peer support.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold mb-2">Search & Discover</h3>
                    <p>Search for students by skills, interests, courses, or projects. Use filters to find exactly what you're looking for within your university.</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-xl font-bold mb-2">Connect & Collaborate</h3>
                    <p>Send messages, join community discussions, or arrange meetups. Build meaningful connections for studies, projects, or shared interests.</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl mb-4">🌟</div>
                    <h3 className="text-xl font-bold mb-2">Succeed Together</h3>
                    <p>Whether it's acing exams, winning hackathons, or launching startups - achieve more through collaborative student networks.</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Why Choose Friendly Learning SRMAP?</h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-primary text-xl">✓</span>
                    <div>
                      <h3 className="font-bold">University-Specific Networks</h3>
                      <p>Connect only with students from your university, ensuring relevance and proximity for meetups and collaborations.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-primary text-xl">✓</span>
                    <div>
                      <h3 className="font-bold">Skill-Based Discovery</h3>
                      <p>Find students based on specific skills, courses, or expertise areas that match your project or learning needs.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-primary text-xl">✓</span>
                    <div>
                      <h3 className="font-bold">Community-Driven Help</h3>
                      <p>Post questions and get help from your university community, with options for follow-up discussions and meetings.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-primary text-xl">✓</span>
                    <div>
                      <h3 className="font-bold">Versatile Use Cases</h3>
                      <p>From academic help to hackathons, startups to social connections - one platform for all your university networking needs.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Ready to Connect with Your University Community?</h2>
                <p className="text-lg mb-6">
                  Join Friendly Learning SRMAP today and discover the power of student collaboration within your university. Whether you need help, want to help others, or looking for project partners - your university community is here for you.
                </p>
                <div className="space-x-4">
                  <Button asChild size="lg">
                    <Link to="/signup">Join Your University Network</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/community-posts">Explore Community Posts</Link>
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </main>
        <TeamMembers teamMembers={teamMembers} />
        <Footer />
      </div>
    </>
  );
};

export default About;
