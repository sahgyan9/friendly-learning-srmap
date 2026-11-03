import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

const SignUp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || "";

  const [formData, setFormData] = useState({
    name: "",
    email: emailParam,
    password: "",
    confirmPassword: "",
    mobile: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<any>(null);
  const [fieldErrors, setFieldErrors] = useState<{ mobile?: string; confirmPassword?: string }>({});

  useEffect(() => {
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
  }, [emailParam]);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
      }
    };
    
    checkSession();
  }, [navigate]);

  // Listen for OAuth completion
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Check if this is a new user (Google OAuth signup)
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', session.user.id)
            .single();

          if (!existingUser || !existingUser.role) {
            // New user, show role selection
            setShowRoleSelection(true);
            setPendingAuthData(session.user);
          } else {
            // Existing user, redirect to home
            navigate('/');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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
      navigate('/profile/setup?new=1');
    } catch (error: unknown) {
      toast.error("Error setting up account: " + getErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextErrors = {
      mobile: formData.mobile ? undefined : "Enter a mobile number so mentors can reach you.",
      confirmPassword:
        formData.password !== formData.confirmPassword ? "The two passwords do not match." : undefined,
    };
    if (nextErrors.mobile || nextErrors.confirmPassword) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      // Register the user with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            full_name: formData.name,
            mobile: formData.mobile
          },
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (authError) throw authError;

      // Store mobile in app users table after signup
      if (authData.user) {
        await supabase
          .from('users')
          .update({ mobile: formData.mobile })
          .eq('id', authData.user.id);
      }

      if (authData.user) {
        if (authData.session) {
          // User can log in immediately, show role selection
          setShowRoleSelection(true);
          setPendingAuthData(authData.user);
        } else {
          // Email confirmation required
          toast.success("Account created. Check your email for a confirmation link.");
          navigate('/signin');
        }
      }
    } catch (error: unknown) {
      console.error('Error during signup:', error);
      const message = getErrorMessage(error, "Error creating account");

      if (message.includes('User already registered') || message.includes('duplicate key')) {
        toast.error("An account with this email already exists. Sign in instead.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        title="Create your account"
        description="Students and mentors at SRM AP use the same account."
        footer={
          <>
            Already registered?{" "}
            <Link to="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <GoogleAuthButton
          mode="signup"
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          destination="/"
        />

        <AuthDivider label="or with email" />

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              disabled={isLoading}
              value={formData.name}
              onChange={handleChange}
              placeholder="As it appears on your ID card"
              className="mt-1.5"
            />
          </div>
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
            />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile number</Label>
            <Input
              id="mobile"
              name="mobile"
              type="tel"
              autoComplete="tel"
              required
              disabled={isLoading}
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-digit number"
              className="mt-1.5"
              aria-invalid={Boolean(fieldErrors.mobile) || undefined}
              aria-describedby={fieldErrors.mobile ? "mobile-error" : undefined}
            />
            <FieldError id="mobile-error">{fieldErrors.mobile}</FieldError>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              disabled={isLoading}
              value={formData.password}
              onChange={handleChange}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              required
              disabled={isLoading}
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1.5"
              aria-invalid={Boolean(fieldErrors.confirmPassword) || undefined}
              aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
            />
            <FieldError id="confirm-error">{fieldErrors.confirmPassword}</FieldError>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLoading ? "Creating account" : "Create account"}
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

export default SignUp;
