import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/lib/theme";

/**
 * Holds no React state on purpose. The current theme lives in exactly one
 * place — the `dark` class on <html> — and both the icon and the label here
 * are switched by CSS from that class.
 *
 * Two things break if this component keeps its own state instead:
 *
 * 1. Public pages are prerendered, so markup driven by a value only known at
 *    runtime would mismatch during hydration for anyone whose stored theme
 *    differs from the default.
 * 2. Sign in, sign up and the password pages render this toggle alongside the
 *    one in the site header. Two copies of local state disagree the moment
 *    either one is clicked.
 */
const DarkModeToggle = () => (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => toggleTheme()}
    className="relative h-10 w-10 rounded-full border border-input"
  >
    <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" />
    <Moon className="absolute h-5 w-5 rotate-90 scale-0 text-yellow-300 transition-transform duration-300 dark:rotate-0 dark:scale-100" />

    {/* Exactly one of these is in the accessibility tree at a time, and the
        label names the action rather than the current state. */}
    <span className="sr-only dark:hidden">Switch to dark theme</span>
    <span className="sr-only hidden dark:inline">Switch to light theme</span>
  </Button>
);

export default DarkModeToggle;
