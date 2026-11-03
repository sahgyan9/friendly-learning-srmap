
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import AuthShell, { FieldError } from "@/components/auth/AuthShell";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a valid session from the password reset link
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          toast.error("This reset link is invalid or has expired. Request a new one.");
          navigate("/forgot-password");
          return;
        }

        if (session) {
          setIsValidSession(true);
        } else {
          // Try to get tokens from URL as fallback
          const params = new URLSearchParams(location.search);
          let accessToken = params.get("access_token");
          
          if (!accessToken && location.hash) {
            const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
            accessToken = hashParams.get("access_token");
          }

          if (!accessToken) {
            toast.error("This reset link is invalid or has expired. Request a new one.");
            navigate("/forgot-password");
            return;
          }
          
          setIsValidSession(true);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        toast.error("Could not check the reset link. Request a new one.");
        navigate("/forgot-password");
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nextErrors = {
      password: !password
        ? "Enter a new password."
        : password.length < 6
        ? "Use at least 6 characters."
        : undefined,
      confirmPassword: !confirmPassword
        ? "Enter the password again."
        : password !== confirmPassword
        ? "The two passwords do not match."
        : undefined,
    };
    if (nextErrors.password || nextErrors.confirmPassword) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        toast.error(error.message || "Failed to reset password");
      } else {
        toast.success("Password changed. Sign in with your new password.");
        navigate("/signin");
      }
    } catch (error: unknown) {
      console.error("Password reset error:", error);
      toast.error("Could not change the password. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking reset link
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return null; // This will be handled by the redirect in useEffect
  }

  const clearError = (field: "password" | "confirmPassword") => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <AuthShell
      title="Set a new password"
      description="Choose a password with at least 6 characters."
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError("password");
            }}
            className="mt-1.5"
            aria-invalid={Boolean(fieldErrors.password) || undefined}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          <FieldError id="password-error">{fieldErrors.password}</FieldError>
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearError("confirmPassword");
            }}
            className="mt-1.5"
            aria-invalid={Boolean(fieldErrors.confirmPassword) || undefined}
            aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
          />
          <FieldError id="confirm-error">{fieldErrors.confirmPassword}</FieldError>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {isLoading ? "Saving" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;
