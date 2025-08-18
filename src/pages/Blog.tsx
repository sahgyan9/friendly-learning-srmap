import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Blog = () => {
    const blogPosts = [
        {
            title: "How to Build the Perfect Hackathon Team in 2025",
            excerpt: "Discover the essential skills and strategies for forming winning hackathon teams at your university through Project FL.",
            date: "August 16, 2025",
            slug: "perfect-hackathon-team-2025",
            tags: ["Hackathons", "Team Building", "University"]
        },
        {
            title: "The Ultimate Guide to Finding Study Partners at University",
            excerpt: "Learn proven strategies for finding compatible study partners and creating effective study groups on campus.",
            date: "August 15, 2025",
            slug: "ultimate-guide-study-partners",
            tags: ["Study Tips", "Academic Success", "Student Life"]
        },
        {
            title: "University Startup Success: How Project FL Connects Student Entrepreneurs",
            excerpt: "Explore how Project FL is revolutionizing student entrepreneurship by connecting like-minded innovators on campus.",
            date: "August 14, 2025",
            slug: "university-startup-success-project-fl",
            tags: ["Startups", "Entrepreneurship", "Student Networking"]
        }
    ];

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Project FL Blog - University Student Collaboration Insights",
        "description": "Expert insights on university student collaboration, hackathon teams, study partners, and campus networking through Project FL platform",
        "url": "https://www.project-fl.me/blog",
        "publisher": {
            "@type": "Organization",
            "name": "Project FL",
            "logo": "https://www.project-fl.me/og-image.png"
        }
    };

    return (
        <>
            <SEOHead
                title="Project FL Blog - University Student Collaboration Tips & Insights"
                description="Expert insights on university student collaboration, finding hackathon partners, study groups, and campus networking. Learn how Project FL is transforming student connections."
                keywords="project fl blog, university student collaboration tips, hackathon team building guide, study partner advice, student networking insights, campus collaboration"
                canonical="https://www.project-fl.me/blog"
                structuredData={structuredData}
            />

            <div className="min-h-screen">
                <Navbar />
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-4xl mx-auto">
                            <header className="text-center mb-12">
                                <h1 className="text-4xl font-bold mb-6">Project FL Blog</h1>
                                <p className="text-xl text-muted-foreground">
                                    Expert insights on university student collaboration and networking
                                </p>
                            </header>

                            <div className="grid gap-8 mb-12">
                                {blogPosts.map((post, index) => (
                                    <article key={index} className="p-6 border rounded-lg">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {post.tags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <h2 className="text-2xl font-bold mb-3">
                                            <Link to={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                                                {post.title}
                                            </Link>
                                        </h2>
                                        <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">{post.date}</span>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link to={`/blog/${post.slug}`}>Read More</Link>
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Ready to Start Collaborating?</h2>
                                <p className="mb-6">Join Project FL and transform your university experience</p>
                                <Button asChild size="lg">
                                    <Link to="/signup">Join Project FL Today</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default Blog;
