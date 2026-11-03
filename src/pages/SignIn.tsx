import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import AuthShell, { AuthDivider, FieldError } from "@/components/auth/AuthShell";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import RoleSelectionModal from "@/components/auth/RoleSelectionModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Info } from "lucide-react";

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<any>(null);
  const [authError, setAuthError] = useState<{
    type: "invalid_credentials" | "unconfirmed" | "timeout" | "other";
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  /**
   * Where to land after signing in.
   *
   * ProtectedRoute (and the rate/post buttons) stash the page you were trying
   * to reach in `location.state.from`. This used to be ignored and everyone was
   * dumped on `/`, so getting to a gated action took a sign-in plus a manual
   * walk back to wherever you started.
   */
  const redirectTo = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const destination = redirectTo?.pathname
    ? `${redirectTo.pathname}${redirectTo.search ?? ""}`
    : "/";

  // A single auth listener drives both the "already signed in" case and OAuth
  // completion. INITIAL_SESSION fires on subscribe, so a separate getSession()
  // call would only duplicate this.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
        if (!session?.user) return;

        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!existingUser || !existingUser.role) {
          // First sign-in via OAuth — ask which role they are before continuing.
          setShowRoleSelection(true);
          setPendingAuthData(session.user);
        } else {
          navigate(destination, { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, destination]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (authError) {
      setAuthError(null);
    }
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = async (role: string) => {
    try {
      if (pendingAuthData) {
        // Update user role for OAuth signup
        const { error } = await supabase
          .from('users')
          .update({ role })
          .eq('id', pendingAuthData.id);

        if (error) throw error;
      }
      
      setShowRoleSelection(false);
      toast.success("Account set up");
      navigate(destination, { replace: true });
    } catch (error: unknown) {
      toast.error("Error setting up account: " + getErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setFieldErrors({
        email: email ? undefined : "Enter the email you signed up with.",
        password: password ? undefined : "Enter your password.",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      // 12-second timeout guard to prevent indefinite hanging on slow network or cold start
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 12000)
      );

      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = (await Promise.race([
        authPromise,
        timeoutPromise,
      ])) as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setAuthError({
            type: "invalid_credentials",
            message: "Invalid email or password.",
          });
        } else if (error.message.includes('Email not confirmed')) {
          setAuthError({
            type: "unconfirmed",
            message: "Open the confirmation email we sent you and follow the link, then sign in.",
          });
        } else {
          setAuthError({
            type: "other",
            message: error.message || "Failed to sign in. Please try again.",
          });
        }
      } else if (data?.user) {
        toast.success("Signed in");
        navigate(destination, { replace: true });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "AUTH_TIMEOUT") {
        setAuthError({
          type: "timeout",
          message: "The server did not respond within 12 seconds. Check your connection and try again, or use Continue with Google.",
        });
      } else {
        console.error('Error during sign in:', error);
        setAuthError({
          type: "other",
          message: "Something went wrong on our side. Try again in a moment.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        title="Sign in"
        description="Use your Google account or the email you registered with."
        footer={
          <>
            No account yet?{" "}
            <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </>
        }
      >
        <GoogleAuthButton
          mode="signin"
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          destination={destination}
        />

        <AuthDivider label="or with email" />

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {authError && (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {authError.type === "invalid_credentials"
                  ? "Email or password is incorrect"
                  : authError.type === "timeout"
                  ? "Sign-in timed out"
                  : authError.type === "unconfirmed"
                  ? "Confirm your email first"
                  : "Could not sign in"}
              </AlertTitle>
              <AlertDescription className="space-y-3 text-foreground/90">
                <p>{authError.message}</p>

                {authError.type === "invalid_credentials" && (
                  <>
                    <Link
                      to={`/signup?email=${encodeURIComponent(formData.email.trim())}`}
                      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Create an account with this email
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <div className="flex items-start gap-2 rounded-md border border-border bg-background p-2.5 text-xs text-muted-foreground">
                      <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <p>
                        <span className="font-medium text-foreground">Registered with Google?</span>{" "}
                        Your account has no password. Use Continue with Google above.
                      </p>
                    </div>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email-address">Email</Label>
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isLoading}
              value={formData.email}
              onChange={handleChange}
              placeholder="you@srmap.edu.in"
              className="mt-1.5"
              aria-invalid={Boolean(fieldErrors.email) || undefined}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            <FieldError id="email-error">{fieldErrors.email}</FieldError>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              value={formData.password}
              onChange={handleChange}
              className="mt-1.5"
              aria-invalid={Boolean(fieldErrors.password) || undefined}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            <FieldError id="password-error">{fieldErrors.password}</FieldError>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLoading ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </AuthShell>

      <RoleSelectionModal
        isOpen={showRoleSelection}
        onRoleSelect={handleRoleSelect}
      />
    </>
  );
};

export default SignIn;
