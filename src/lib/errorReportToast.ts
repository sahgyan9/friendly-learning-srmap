// Adds a one-click "Report" action to every toast.error(...) call in the app,
// without touching the ~100 call sites that already use `toast.error` from
// "sonner" directly. sonner's `toast` export is a shared singleton, so
// monkey-patching `.error` once here changes it everywhere it's imported.
import { toast } from "sonner";
import { reportErrorToAdmin } from "./reportError";
import { captureMessage } from "./sentry";

type ToastMessage = Parameters<typeof toast.error>[0];
type ToastErrorOptions = Parameters<typeof toast.error>[1];

let installed = false;

function extractText(message: ToastMessage, opts: ToastErrorOptions): string {
  const title = typeof message === "string" ? message : "An error occurred";
  const description =
    opts && typeof opts === "object" && "description" in opts && typeof opts.description === "string"
      ? opts.description
      : null;
  return description ? `${title}: ${description}` : title;
}

export function installErrorReportAction(): void {
  if (installed) return;
  installed = true;

  const originalError = toast.error.bind(toast);

  toast.error = ((message: ToastMessage, opts: ToastErrorOptions = {}) => {
    // Respect a call site that already wired up its own action (e.g. "Retry").
    if (opts && typeof opts === "object" && "action" in opts && opts.action) {
      return originalError(message, opts);
    }

    const text = extractText(message, opts);

    return originalError(message, {
      ...opts,
      action: {
        label: "Report",
        onClick: () => {
          captureMessage(`User-reported error: ${text}`, "warning");
          reportErrorToAdmin(text).then(
            () => toast.success("Reported to admin — thanks for flagging it."),
            () => toast.error("Couldn't send the report. Try again."),
          );
        },
      },
    });
  }) as typeof toast.error;
}
