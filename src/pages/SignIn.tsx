import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import DarkModeToggle from "@/components/DarkModeToggle";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import RoleSelectionModal from "@/components/auth/RoleSelectionModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

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
      toast.success("Welcome to Friendly Learning!");
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
      toast.error("Please fill in all fields");
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
          toast.error("Invalid credentials. If you haven't created an account yet, please sign up.");
        } else if (error.message.includes('Email not confirmed')) {
          setAuthError({
            type: "unconfirmed",
            message: "Please check your inbox and confirm your email before signing in.",
          });
          toast.error("Please check your email and click the confirmation link before signing in.");
        } else {
          setAuthError({
            type: "other",
            message: error.message || "Failed to sign in. Please try again.",
          });
          toast.error(error.message);
        }
      } else if (data?.user) {
        toast.success("Successfully signed in!");
        navigate(destination, { replace: true });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "AUTH_TIMEOUT") {
        setAuthError({
          type: "timeout",
          message: "Sign-in is taking longer than expected. Please check your internet connection or use Google Sign-In.",
        });
        toast.error("Sign-in timed out. Please check your connection or try Google Sign-In.");
      } else {
        console.error('Error during sign in:', error);
        setAuthError({
          type: "other",
          message: "An unexpected error occurred. Please try again.",
        });
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

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
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Or{' '}
              <Link to="/signup" className="font-medium text-primary hover:text-primary/80">
                create a new account
              </Link>
            </p>
          </div>
          
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-card text-card-foreground px-4 py-8 shadow sm:rounded-lg sm:px-10">
              {/* Google button at the top — primary OAuth action */}
              <GoogleAuthButton 
                mode="signin" 
                isLoading={isLoading} 
                setIsLoading={setIsLoading} 
                destination={destination}
              />

              <div className="my-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-card text-muted-foreground">or sign in with email</span>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <AnimatePresence>
                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-foreground">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <AlertTitle className="text-sm font-semibold text-destructive">
                          {authError.type === "invalid_credentials"
                            ? "Account not found or incorrect password"
                            : authError.type === "timeout"
                            ? "Sign-In Timed Out"
                            : authError.type === "unconfirmed"
                            ? "Email Verification Required"
                            : "Unable to sign in"}
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs space-y-2">
                          <p className="text-foreground/90 leading-relaxed">
                            {authError.message}
                          </p>

                          {authError.type === "invalid_credentials" && (
                            <div className="pt-2 mt-2 border-t border-destructive/20 space-y-2 text-xs">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="text-muted-foreground">Don't have an account yet?</span>
                                <Link
                                  to={`/signup?email=${encodeURIComponent(formData.email.trim())}`}
                                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                >
                                  <span>Create account</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </div>
                              <div className="text-[11px] text-muted-foreground bg-background/80 p-2 rounded border border-border/60">
                                💡 <strong>Signed in with Google before?</strong> If you previously registered using Google, please click <strong>"Continue with Google"</strong> above.
                              </div>
                            </div>
                          )}

                          {authError.type === "timeout" && (
                            <div className="pt-1 text-[11px] text-muted-foreground">
                              Please check your connection and try again, or click <strong>"Continue with Google"</strong> above.
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <Label htmlFor="email-address">Email address</Label>
                  <Input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isLoading}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    disabled={isLoading}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <div className="text-sm">
                    <Link 
                      to="/forgot-password" 
                      className="font-medium text-primary hover:text-primary/80"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Signing in...</span>
                      </span>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      <RoleSelectionModal 
        isOpen={showRoleSelection}
        onRoleSelect={handleRoleSelect}
      />
    </div>
  );
};

export default SignIn;
