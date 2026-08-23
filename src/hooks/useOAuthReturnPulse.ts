import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const FLAG_KEY = "fl_oauth_pending";
const PULSE_MS = 1400;

/**
 * Set right before redirecting to Google's OAuth screen, so a return trip
 * that bailed out can be told apart from an ordinary page load.
 */
export function markOAuthAttemptStarted() {
  try {
    sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode, disabled) — the pulse is a
    // nice-to-have, not something the auth flow depends on.
  }
}

/**
 * True for a brief window after the visitor backs out of Google's sign-in
 * screen without completing it, so the Sign in button can draw the eye back
 * to itself instead of leaving them stranded with no obvious next step.
 *
 * Stays false on an ordinary visit and on a completed sign-in — only a
 * bailed-out attempt earns the reassurance.
 */
export function useOAuthReturnPulse(): boolean {
  const { user, loading } = useAuth();
  const [pulse, setPulse] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (loading || checked.current) return;
    checked.current = true;

    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(FLAG_KEY);
      sessionStorage.removeItem(FLAG_KEY);
    } catch {
      return;
    }
    if (!pending || user) return;

    setPulse(true);
    const timer = setTimeout(() => setPulse(false), PULSE_MS);
    return () => clearTimeout(timer);
  }, [loading, user]);

  return pulse;
}
