
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MailCheck } from "lucide-react";
import AuthShell, { FieldError } from "@/components/auth/AuthShell";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setEmailError("Enter the email you signed up with.");
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || "Could not send the reset email");
      } else {
        setEmailSent(true);
        toast.success("Reset email sent");
      }
    } catch (error: unknown) {
      toast.error("Could not send the reset email. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const backToSignIn = (
    <Link to="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
      Back to sign in
    </Link>
  );

  if (emailSent) {
    return (
      <AuthShell
        title="Check your email"
        description={
          <>
            We sent a reset link to <span className="font-medium text-foreground">{email}</span>.
          </>
        }
        footer={backToSignIn}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <MailCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Open the link in that email to choose a new password. It can take a minute to arrive;
              check your spam folder if it does not.
            </p>
          </div>
          <Button onClick={() => setEmailSent(false)} variant="outline" className="w-full">
            Send another email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we will send you a link to set a new password."
      footer={backToSignIn}
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(undefined);
            }}
            placeholder="you@srmap.edu.in"
            className="mt-1.5"
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          <FieldError id="email-error">{emailError}</FieldError>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {isLoading ? "Sending" : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
