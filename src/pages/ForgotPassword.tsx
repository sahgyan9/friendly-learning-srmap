
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import DarkModeToggle from "@/components/DarkModeToggle";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || "Failed to send reset email");
      } else {
        setEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
      }
    } catch (error: unknown) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <div className="absolute top-4 right-4">
          <DarkModeToggle />
        </div>
        <div className="flex flex-grow items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="max-w-md w-full space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <Link to="/" className="block text-2xl font-bold text-primary mb-2">
                <span className="mr-1">Friendly</span>
                <span className="dark:text-gray-200">Learning</span>
              </Link>
              <h2 className="mt-6 text-3xl font-extrabold">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We've sent a password reset link to {email}
              </p>
            </div>
            
            <div className="bg-card text-card-foreground px-4 py-8 shadow sm:rounded-lg sm:px-10">
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Click the link in your email to reset your password. If you don't see the email, check your spam folder.
                </p>
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Send another email
                  </Button>
                  <Link to="/signin">
                    <Button variant="ghost" className="w-full">
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>
      <div className="flex flex-grow items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="max-w-md w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <Link to="/" className="block text-center text-2xl font-bold text-primary mb-2">
              <span className="mr-1">Friendly</span>
              <span className="dark:text-gray-200">Learning</span>
            </Link>
            <h2 className="mt-6 text-center text-3xl font-extrabold">
              Forgot your password?
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-card text-card-foreground px-4 py-8 shadow sm:rounded-lg sm:px-10">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send reset link"}
                  </Button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <Link to="/signin" className="text-sm text-primary hover:text-primary/80">
                  Back to sign in
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
