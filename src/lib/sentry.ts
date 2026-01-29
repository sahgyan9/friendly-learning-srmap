// Sentry error tracking configuration
import * as Sentry from "@sentry/react";

// Initialize Sentry - only in production
export const initSentry = () => {
    if (import.meta.env.PROD) {
        Sentry.init({
            dsn: import.meta.env.VITE_SENTRY_DSN || "",
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({
                    maskAllText: false,
                    blockAllMedia: false,
                }),
            ],
            // Performance Monitoring
            tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
            // Session Replay
            replaysSessionSampleRate: 0.1, // Sample 10% of sessions for replay
            replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
            // Environment
            environment: import.meta.env.MODE,
            // Only send errors in production
            enabled: import.meta.env.PROD,
            // Ignore common non-critical errors
            ignoreErrors: [
                "ResizeObserver loop limit exceeded",
                "ResizeObserver loop completed with undelivered notifications",
                "Non-Error promise rejection captured",
                /Loading chunk \d+ failed/,
                /Failed to fetch dynamically imported module/,
            ],
            // Before sending event, you can modify or drop it
            beforeSend(event, hint) {
                // Don't send events in development
                if (import.meta.env.DEV) {
                    return null;
                }
                return event;
            },
        });
    }
};

// Utility to capture exceptions manually
export const captureException = (error: Error, context?: Record<string, unknown>) => {
    if (import.meta.env.PROD) {
        Sentry.captureException(error, {
            extra: context,
        });
    } else {
        console.error("Error captured:", error, context);
    }
};

// Utility to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
    if (import.meta.env.PROD) {
        Sentry.captureMessage(message, level);
    }
};

// Set user context for better error tracking
export const setUserContext = (user: { id: string; email?: string; name?: string } | null) => {
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.name,
        });
    } else {
        Sentry.setUser(null);
    }
};

export default Sentry;
