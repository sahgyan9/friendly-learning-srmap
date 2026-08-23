/**
 * Theme is decided and applied to <html> by the inline script in index.html,
 * before the browser paints anything. This module only keeps the DOM and
 * localStorage in step once the app is interactive.
 *
 * The single source of truth is the `dark` class on <html> — deliberately not
 * React state. See DarkModeToggle for why that matters.
 *
 * If you change the storage key or the default here, change the inline script
 * in index.html to match.
 */
import { supabase } from "@/integrations/supabase/client";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "theme";

/** Light is the default. Only an explicit stored "dark" opts in. */
export const DEFAULT_THEME: Theme = "light";

// Set by AuthContext on sign-in/sign-out. Module-level rather than a param
// threaded through every call site, matching setUserContext in lib/sentry.ts.
let currentUserId: string | null = null;

export function setThemeUserId(userId: string | null): void {
  currentUserId = userId;
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");

  // Keeps the surfaces the browser paints itself — scrollbars, form controls,
  // the canvas behind the page — in the same theme as our own CSS.
  root.style.colorScheme = theme;
}

/**
 * Applies a theme fetched from the user's account and mirrors it to
 * localStorage, without writing back to the database. Used when a saved
 * preference is pulled down on sign-in, so it doesn't just echo itself back.
 */
export function syncLocalTheme(theme: Theme): void {
  applyTheme(theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies). The
    // theme still applies to this page; it just will not be remembered.
  }
}

export function setTheme(theme: Theme): void {
  syncLocalTheme(theme);

  if (currentUserId) {
    void supabase.from("users").update({ theme }).eq("id", currentUserId);
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
