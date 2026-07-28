import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

/**
 * Route guard.
 *
 * Admin status is read from the profile the AuthProvider already loaded rather
 * than re-queried here. The previous version kicked off an async admin check in
 * an effect while rendering with `isAdmin = false` and `checkingAdmin = false`
 * on that same pass — so the `<Navigate to="/unauthorized">` branch ran before
 * the check ever started, and genuine admins were bounced off admin pages.
 *
 * This is a UX guard only. Authorisation is enforced server-side by RLS.
 */
const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  // `profile` lands a moment after `user`; waiting for it prevents the same
  // premature-redirect race for role-gated routes.
  const awaitingProfile = requiredRole !== undefined && user !== null && profile === null;

  if (loading || awaitingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Remember where they were headed so sign-in can send them straight back.
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (requiredRole === "admin" && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
