import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import Logo from "@/components/Logo";

interface AuthShellProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Secondary navigation under the card, e.g. "No account? Create one". */
  footer?: ReactNode;
}

/**
 * Shared frame for sign-in, sign-up and password pages: one centred column,
 * one card, one primary action inside it. Keeping the four pages on the
 * same frame means a user moving between them never re-learns the layout.
 */
const AuthShell = ({ title, description, children, footer }: AuthShellProps) => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <div className="flex items-center justify-between px-4 py-4 sm:px-6">
      <Link to="/" aria-label="Friendly Learning home" className="rounded-md">
        <Logo textColor="text-foreground" />
      </Link>
      <DarkModeToggle />
    </div>
    <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-card sm:p-6">
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  </div>
);

/** Plain-language error under a field, wired to it through aria-describedby. */
export const FieldError = ({ id, children }: { id: string; children?: ReactNode }) =>
  children ? (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive" role="alert">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  ) : null;

/** "or continue with email" rule between the OAuth button and the form. */
export const AuthDivider = ({ label }: { label: string }) => (
  <div className="relative my-5">
    <div className="absolute inset-0 flex items-center" aria-hidden>
      <div className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center text-xs">
      <span className="bg-card px-3 text-muted-foreground">{label}</span>
    </div>
  </div>
);

export default AuthShell;
