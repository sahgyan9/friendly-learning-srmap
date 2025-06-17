
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the form data to a server
    console.log("Form submitted:", formData);
    toast.success("Message sent successfully! We'll get back to you soon.");
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: ""
    });
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Friendly Learning",
    "description": "Get in touch with the Friendly Learning team for support, feedback, or questions about our SRM AP mentorship platform",
    "mainEntity": {
      "@type": "Organization",
      "name": "Friendly Learning",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Customer Service",
        "availableLanguage": "English"
      }
    }
  };

  return (
    <>
      <SEOHead
        title="Contact Friendly Learning - Get Support for SRM AP Mentorship Platform"
        description="Have questions about Friendly Learning? Contact our support team for help with mentor connections, platform features, or technical support. We're here to help SRM AP students succeed!"
        keywords="contact Friendly Learning, SRM AP mentorship support, student platform help, mentorship questions, technical support"
        canonical="https://friendly-learning.lovable.app/contact"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <header className="mb-10">
                <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
                
                <p className="text-lg mb-4">
                  Have questions or feedback about our SRM AP mentorship platform? We'd love to hear from you.
                </p>
                <p className="text-lg">
                  Fill out the form below and we'll get back to you as soon as possible.
                </p>
              </header>
              
              <section>
                <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-label="Contact form">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">Full Name *</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your full name"
                      aria-required="true"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address *</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="your.email@srmuniv.edu.in"
                      aria-required="true"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">Subject *</label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="What is this regarding?"
                      aria-required="true"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full p-3 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Please describe your question or feedback in detail..."
                      aria-required="true"
                    />
                  </div>
                  
                  <div>
                    <Button type="submit" size="lg" className="w-full md:w-auto">
                      Send Message
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Contact;
