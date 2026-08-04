import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface WelcomeTourContextType {
  open: boolean;
  openTour: () => void;
  closeTour: () => void;
}

const WelcomeTourContext = createContext<WelcomeTourContextType | undefined>(undefined);

/**
 * Auto-opens once per account, the first time `profile.has_seen_welcome_tour`
 * loads as `false`, and persists the dismissal to the users row so it doesn't
 * reappear on another device. Signed-out visitors never see it here — there is
 * no account yet to remember the flag on.
 */
export function WelcomeTourProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);

  // Auto-open decision is made once per signed-in session, not on every
  // profile refetch (refreshProfile fires on unrelated profile edits too).
  const autoOpenedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    if (autoOpenedFor.current === user.id) return;

    autoOpenedFor.current = user.id;
    if (profile.has_seen_welcome_tour === false) {
      setOpen(true);
    }
  }, [user, profile]);

  const openTour = useCallback(() => setOpen(true), []);

  const closeTour = useCallback(() => {
    setOpen(false);

    if (user && profile?.has_seen_welcome_tour === false) {
      void supabase
        .from("users")
        .update({ has_seen_welcome_tour: true })
        .eq("id", user.id)
        .then(() => refreshProfile());
    }
  }, [user, profile, refreshProfile]);

  const value = useMemo<WelcomeTourContextType>(
    () => ({ open, openTour, closeTour }),
    [open, openTour, closeTour],
  );

  return <WelcomeTourContext.Provider value={value}>{children}</WelcomeTourContext.Provider>;
}

export function useWelcomeTour() {
  const context = useContext(WelcomeTourContext);
  if (context === undefined) {
    throw new Error("useWelcomeTour must be used within a WelcomeTourProvider");
  }
  return context;
}
