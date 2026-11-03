import { PRIMARY_DOMAIN } from "@/lib/constants";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const Contact = () => {
  // Auth context to determine if user is signed in
  const { user, profile, loading } = useAuth();

  const isAuthenticated = !!user && !!profile;

  // Keep full formData shape for backend compatibility, but we'll hide fields for signed-in users
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // For authenticated users, ensure we attach latest profile info automatically
      const submissionBody = {
        name: isAuthenticated ? (profile?.name || formData.name || "") : formData.name,
        email: isAuthenticated ? (profile?.email || formData.email || "") : formData.email,
        subject: formData.subject || (isAuthenticated ? "User Inquiry" : ""),
        message: formData.message
      };

      const { data, error } = await supabase.functions.invoke('contact-form', {
        body: submissionBody
      });

      if (error) {
        // A 400 or 429 carries a message written for the visitor (field too
        // long, rate limit). invoke() does not surface the body on its own.
        let serverMessage: string | undefined;
        try {
          const context = (error as { context?: Response }).context;
          if (context && typeof context.json === "function") serverMessage = (await context.json())?.error;
        } catch {
          // Body was not JSON; fall through to the generic message.
        }
        throw new Error(serverMessage || "Could not send your message. Try again in a minute.");
      }

      if (data?.success) {
        toast.success("Message sent. We will reply to your email.");
        setFormData({
          name: profile?.name || "",
          email: profile?.email || "",
          subject: "",
          message: ""
        });
      } else {
        throw new Error(data?.error || "Could not send your message. Try again in a minute.");
      }
    } catch (error) {
      console.error('Error sending contact message:', error);
      toast.error(error instanceof Error ? error.message : "Could not send your message. Try again in a minute.");
    } finally {
      setIsSubmitting(false);
    }
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
        title={ROUTE_META["/contact"].title}
        description={ROUTE_META["/contact"].description}
        keywords="contact Friendly Learning, SRM AP mentorship support, student platform help, mentorship questions, technical support"
        canonical={`${PRIMARY_DOMAIN}/contact`}
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-background text-foreground">
        <main className="pb-16 pt-16 md:pt-24">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-2xl">
              <header className="mb-10 animate-fade-up">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Contact us</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                  Questions, bug reports or feedback about Friendly Learning.{" "}
                  {isAuthenticated
                    ? "We will reply to the email on your account."
                    : "We will reply to the email you enter below."}
                </p>
              </header>

              <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
                {loading ? (
                  <div className="space-y-5" aria-busy="true">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-11 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                    <Skeleton className="h-11 w-36" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" aria-label="Contact form">
                    {!isAuthenticated && (
                      <>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="min-w-0 space-y-2">
                            <Label htmlFor="name">Full name</Label>
                            <Input
                              id="name"
                              name="name"
                              type="text"
                              required
                              maxLength={100}
                              autoComplete="name"
                              value={formData.name}
                              onChange={handleChange}
                              className="h-11"
                              aria-required="true"
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="min-w-0 space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              required
                              maxLength={254}
                              autoComplete="email"
                              value={formData.email}
                              onChange={handleChange}
                              className="h-11"
                              placeholder="you@example.com"
                              aria-required="true"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Input
                            id="subject"
                            name="subject"
                            type="text"
                            required
                            maxLength={200}
                            value={formData.subject}
                            onChange={handleChange}
                            className="h-11"
                            placeholder="What is this about?"
                            aria-required="true"
                            disabled={isSubmitting}
                          />
                        </div>
                      </>
                    )}

                    {isAuthenticated && (
                      <p className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                        Sending as <span className="font-medium text-foreground">{profile?.name}</span>{" "}
                        <span className="text-muted-foreground">({profile?.email})</span>
                      </p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <Label htmlFor="message">Message</Label>
                        {/* Counter appears near the limit, where it helps, not before */}
                        {formData.message.length > 4500 && (
                          <span
                            className={`tabular text-xs ${formData.message.length >= 5000 ? "text-destructive" : "text-muted-foreground"}`}
                            aria-live="polite"
                          >
                            {formData.message.length}/5000
                          </span>
                        )}
                      </div>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        required
                        maxLength={5000}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Describe your question or feedback. For bugs, include the page and what you expected to happen."
                        aria-required="true"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto"
                      isLoading={isSubmitting}
                      disabled={!formData.message.trim() || (!isAuthenticated && (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim()))}
                    >
                      {isSubmitting ? "Sending" : "Send message"}
                    </Button>
                  </form>
                )}
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
