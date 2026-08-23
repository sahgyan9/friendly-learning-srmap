
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAppUrl } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { markOAuthAttemptStarted } from "@/hooks/useOAuthReturnPulse";

interface GoogleAuthButtonProps {
  mode: "signin" | "signup";
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const GoogleAuthButton = ({ mode, isLoading, setIsLoading }: GoogleAuthButtonProps) => {
  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      markOAuthAttemptStarted();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAppUrl()}/`,
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Error ${mode === 'signin' ? 'signing in' : 'signing up'} with Google`));
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={isLoading}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        gap: "12px",
        padding: "10px 24px",
        borderRadius: "4px",
        border: "1px solid #dadce0",
        backgroundColor: "#fff",
        color: "#3c4043",
        fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
        fontSize: "14px",
        fontWeight: 500,
        letterSpacing: "0.25px",
        lineHeight: "16px",
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.7 : 1,
        boxShadow: "0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)",
        transition: "background-color 0.218s, border-color 0.218s, box-shadow 0.218s",
        outline: "none",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 1px 3px 0 rgba(60,64,67,.30), 0 4px 8px 3px rgba(60,64,67,.15)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f8faff";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff";
        }
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 0 0 3px rgba(66,133,244,0.30)";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3px 1px rgba(60,64,67,.15)";
      }}
    >
      {/* Official Google G logo — full colour */}
      <svg
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        style={{ width: 18, height: 18, flexShrink: 0 }}
        aria-hidden="true"
      >
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        <path fill="none" d="M0 0h48v48H0z" />
      </svg>

      <span>
        {isLoading
          ? mode === "signin"
            ? "Signing in…"
            : "Signing up…"
          : mode === "signin"
          ? "Continue with Google"
          : "Sign up with Google"}
      </span>
    </button>
  );
};

export default GoogleAuthButton;
