import { Component, ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Automatically handle Vite / Vercel dynamic import chunk loading errors after new deployments
        const isChunkLoadError =
            error?.name === "ChunkLoadError" ||
            error?.message?.includes("Failed to fetch dynamically imported module") ||
            error?.message?.includes("Importing a module script failed") ||
            error?.message?.includes("dynamically imported module");

        // One reload, not a loop. A chunk that 404s because the deploy moved on
        // is fixed by fetching the new index.html; a chunk that fails for any
        // other reason will keep failing, and reloading on every catch spins the
        // tab forever. The stamp is per-tab and expires, so a genuine second
        // deploy an hour later still gets its own retry.
        if (isChunkLoadError) {
            const RETRY_KEY = "chunk_reload_at";
            const last = Number(sessionStorage.getItem(RETRY_KEY) ?? 0);
            if (Date.now() - last > 30_000) {
                sessionStorage.setItem(RETRY_KEY, String(Date.now()));
                window.location.reload();
                return;
            }
        }

        // Log error to Sentry in production
        if (import.meta.env.PROD) {
            Sentry.captureException(error, {
                extra: {
                    componentStack: errorInfo.componentStack,
                },
            });
        } else {
            console.error("Error caught by ErrorBoundary:", error, errorInfo);
        }
    }

    handleRefresh = () => {
        window.location.reload();
    };

    /**
     * Everything below is deliberately plain DOM.
     *
     * This boundary is mounted *outside* <BrowserRouter>, so nothing it renders
     * can use a router hook. It used to reach for <Link>, whose useHref reads
     * the navigation context and destructures `basename` off it — and outside a
     * Router that context is null. So the moment the boundary caught anything,
     * the fallback threw too, and an error thrown while rendering a boundary's
     * own fallback is unrecoverable: React unmounted the whole root and left a
     * blank page. That turned every recoverable error in the app into a white
     * screen that a refresh could not clear.
     *
     * A full page load is also the better recovery here. The tree that just
     * crashed is not one to hand back to a client-side navigation.
     */
    render() {
        if (this.state.hasError) {
            // Custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-destructive/10">
                                <AlertTriangle className="h-12 w-12 text-destructive" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-muted-foreground">
                                We apologize for the inconvenience. An unexpected error occurred.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="p-4 rounded-lg bg-muted text-left overflow-auto max-h-40">
                                <p className="text-sm font-mono text-destructive">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={this.handleRefresh} variant="default">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Page
                            </Button>
                            <Button variant="outline" asChild>
                                <a href="/">
                                    <Home className="h-4 w-4 mr-2" />
                                    Go to Home
                                </a>
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            If this problem persists, please{" "}
                            <a href="/contact" className="text-primary hover:underline">
                                contact support
                            </a>
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
