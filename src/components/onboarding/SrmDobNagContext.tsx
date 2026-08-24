import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";

const DISMISS_KEY = "srm-dob-nag-dismissed-until";
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface SrmDobNagContextType {
  open: boolean;
  openNag: () => void;
  dismissNag: () => void;
}

const SrmDobNagContext = createContext<SrmDobNagContextType | undefined>(undefined);

/**
 * Auto-opens once per session for a mentor whose SRM portal isn't linked yet
 * (profile.date_of_birth_linked === false), nudging them toward the linking
 * dialog. Unlike WelcomeTourContext, dismissing this does NOT flip a DB flag
 * — only a real successful link (server-side, via import-srm-portal's
 * step:"link") sets date_of_birth_linked, so "Remind me later" must not fake
 * that. Instead it sets a short localStorage cooldown, purely to avoid
 * re-nagging on every single page load for a mentor who's already said "not
 * now" — it doesn't need to survive across devices the way a real completion
 * flag would.
 */
export function SrmDobNagProvider({ children }: { children: ReactNode }) {
  const { user, profile, isMentor } = useAuth();
  const [open, setOpen] = useState(false);

  const autoOpenedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !profile || !isMentor) return;
    if (autoOpenedFor.current === user.id) return;
    autoOpenedFor.current = user.id;

    if (profile.date_of_birth_linked === false) {
      const dismissedUntil = Number(localStorage.getItem(`${DISMISS_KEY}:${user.id}`) ?? 0);
      if (Date.now() >= dismissedUntil) {
        setOpen(true);
      }
    }
  }, [user, profile, isMentor]);

  const openNag = useCallback(() => setOpen(true), []);

  const dismissNag = useCallback(() => {
    setOpen(false);
    if (user) {
      localStorage.setItem(`${DISMISS_KEY}:${user.id}`, String(Date.now() + DISMISS_COOLDOWN_MS));
    }
  }, [user]);

  const value = useMemo<SrmDobNagContextType>(
    () => ({ open, openNag, dismissNag }),
    [open, openNag, dismissNag],
  );

  return <SrmDobNagContext.Provider value={value}>{children}</SrmDobNagContext.Provider>;
}

export function useSrmDobNag() {
  const context = useContext(SrmDobNagContext);
  if (context === undefined) {
    throw new Error("useSrmDobNag must be used within a SrmDobNagProvider");
  }
  return context;
}
